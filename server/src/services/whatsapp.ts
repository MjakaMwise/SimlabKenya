import pool from '../config/postgres.js';
import { notifyUsers } from './push.js';
import { handleIncoming } from './bot.js';

// Talks to the WhatsApp bridge container (./whatsapp) over the private Docker network.
// Incoming messages arrive on its server-sent-events stream, so no public webhook is needed.
const WA_URL = (process.env.WA_URL || 'http://whatsapp:8080').replace(/\/$/, '');
const WA_API_KEY = process.env.WA_API_KEY || '';
export const waConfigured = !!WA_API_KEY;

const headers = () => ({ 'X-API-Key': WA_API_KEY, 'Content-Type': 'application/json' });

/** Digits only, country code first. 0712 345 678 and +254 712 345 678 both become 254712345678. */
export const normalizePhone = (raw: string): string | null => {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '254' + d.slice(1);
  else if (/^[71]\d{8}$/.test(d)) d = '254' + d;
  return d.length >= 10 && d.length <= 15 ? d : null;
};
export const last9 = (raw: string) => raw.replace(/\D/g, '').slice(-9);
const chatId = (phone: string) => `${phone}@c.us`;

export interface WaStatus { online: boolean; connected: boolean; ready: boolean; state: string | null; qr: string | null }

// The QR is only worth showing while pairing.
const findQr = (v: unknown, depth = 0): string | null => {
  if (!v || typeof v !== 'object' || depth > 4) return null;
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (/qr/i.test(k) && typeof val === 'string' && val.length > 40) return val;
    const nested = findQr(val, depth + 1);
    if (nested) return nested;
  }
  return null;
};

export const getStatus = async (): Promise<WaStatus> => {
  if (!waConfigured) return { online: false, connected: false, ready: false, state: 'not configured', qr: null };
  try {
    const res = await fetch(`${WA_URL}/health`, { headers: headers(), signal: AbortSignal.timeout(4000) });
    const j = (await res.json()) as { connected?: boolean; session?: { ready?: boolean; state?: string; status?: string } };
    const ready = !!j.session?.ready;
    return { online: true, connected: !!j.connected, ready, state: j.session?.state ?? j.session?.status ?? null, qr: ready ? null : findQr(j) };
  } catch {
    return { online: false, connected: false, ready: false, state: 'unreachable', qr: null };
  }
};

export const sendText = async (phone: string, content: string): Promise<string | null> => {
  if (!waConfigured) throw new Error('WhatsApp is not set up yet');
  const body = JSON.stringify({ to: chatId(phone), content });
  let res = await fetch(`${WA_URL}/api/messages/sendText`, { method: 'POST', headers: headers(), body, signal: AbortSignal.timeout(20000) });
  if (res.status === 404) res = await fetch(`${WA_URL}/api/sendText`, { method: 'POST', headers: headers(), body, signal: AbortSignal.timeout(20000) });
  const j = (await res.json().catch(() => ({}))) as { success?: boolean; data?: unknown; error?: unknown };
  if (!res.ok || j.success === false) throw new Error(typeof j.error === 'string' ? j.error : `WhatsApp refused the message (${res.status})`);
  return typeof j.data === 'string' ? j.data : null;
};

// ── Conversations ────────────────────────────────────────────────────────────
const clip = (s: string, n = 120) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export const upsertConversation = async (phone: string, name?: string | null) => {
  const { rows } = await pool.query(
    `INSERT INTO wa_conversations (phone, name) VALUES ($1, $2)
     ON CONFLICT (phone) DO UPDATE SET name = COALESCE(wa_conversations.name, EXCLUDED.name)
     RETURNING *`,
    [phone, name?.trim() || null]
  );
  return rows[0];
};

export const recordMessage = async (
  conversationId: string,
  m: { direction: 'in' | 'out'; sender: 'client' | 'bot' | 'staff'; staffId?: string | null; body: string; waId?: string | null; status?: 'sending' | 'sent' | 'failed'; error?: string | null }
) => {
  const { rows } = await pool.query(
    `INSERT INTO wa_messages (conversation_id, direction, sender, staff_id, body, wa_id, status, error)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (wa_id) DO NOTHING RETURNING *`,
    [conversationId, m.direction, m.sender, m.staffId ?? null, m.body, m.waId ?? null, m.status ?? 'sent', m.error ?? null]
  );
  if (rows[0]) {
    await pool.query(
      `UPDATE wa_conversations SET last_message_at = now(), last_message_preview = $2,
         unread = CASE WHEN $3 = 'in' THEN unread + 1 ELSE unread END,
         status = CASE WHEN $3 = 'in' THEN 'open' ELSE status END
       WHERE id = $1`,
      [conversationId, clip(m.body), m.direction]
    );
  }
  return rows[0] ?? null;
};

/** Sends as the bot or a person, and stores the result. A failed send is kept so staff can see it. */
export const reply = async (conv: { id: string; phone: string }, sender: 'bot' | 'staff', body: string, staffId?: string) => {
  try {
    const waId = await sendText(conv.phone, body);
    return await recordMessage(conv.id, { direction: 'out', sender, staffId, body, waId });
  } catch (err) {
    await recordMessage(conv.id, { direction: 'out', sender, staffId, body, status: 'failed', error: (err as Error).message.slice(0, 300) });
    throw err;
  }
};

/** Everyone who can see the inbox: administrators and staff with whatsapp access. */
export const inboxPeople = async (): Promise<string[]> => {
  const { rows } = await pool.query(
    `SELECT id FROM admin_users WHERE active AND (role = 'admin' OR permissions && ARRAY['whatsapp:view','whatsapp:manage'])`
  );
  return rows.map((r) => r.id as string);
};

export const alertStaff = async (conv: { id: string; assigned_to: string | null; name: string | null; phone: string }, body: string, tag: string) => {
  const people = conv.assigned_to ? [conv.assigned_to] : await inboxPeople();
  await notifyUsers(people, { title: conv.name || `+${conv.phone}`, body: clip(body, 140), url: `/admin/whatsapp?c=${conv.id}`, tag });
};

// ── Incoming events ──────────────────────────────────────────────────────────
interface RawMessage {
  id?: string; from?: string; to?: string; body?: string; caption?: string; type?: string;
  fromMe?: boolean; isGroupMsg?: boolean; sender?: { pushname?: string; formattedName?: string }; notifyName?: string;
}

const onMessage = async (m: RawMessage) => {
  const peer = m.from;
  if (m.fromMe || !peer || !peer.endsWith('@c.us') || m.isGroupMsg) return;
  const phone = peer.replace(/\D/g, '');
  const text = (m.body || m.caption || '').trim() || (m.type && m.type !== 'chat' ? `[${m.type}]` : '');
  if (!text) return;

  const conv = await upsertConversation(phone, m.sender?.pushname || m.notifyName || m.sender?.formattedName);
  const saved = await recordMessage(conv.id, { direction: 'in', sender: 'client', body: text, waId: m.id });
  if (!saved) return; // already handled
  const handledByBot = await handleIncoming(conv, text).catch((err) => {
    console.error('[whatsapp] bot error:', (err as Error).message);
    return false;
  });
  if (!handledByBot) await alertStaff(conv, text, `wa-${conv.id}`);
};

let streaming = false;

const readStream = async () => {
  const res = await fetch(`${WA_URL}/api/events?topics=message.received`, { headers: { 'X-API-Key': WA_API_KEY, Accept: 'text/event-stream' } });
  if (!res.ok || !res.body) throw new Error(`event stream returned ${res.status}`);
  const decoder = new TextDecoder();
  let buf = '';
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
      if (!data) continue;
      try {
        const env = JSON.parse(data) as { event?: string; payload?: { message?: RawMessage } & RawMessage };
        if (env.event !== 'message.received') continue;
        const msg = env.payload?.message ?? env.payload;
        if (msg) await onMessage(msg);
      } catch (err) {
        console.error('[whatsapp] could not handle event:', (err as Error).message);
      }
    }
  }
};

// Keeps one connection to the bridge open, reconnecting quietly while the container is down or starting.
export const startWhatsApp = () => {
  if (!waConfigured || streaming) return;
  streaming = true;
  let delay = 2000;
  const loop = async () => {
    try {
      await readStream();
      delay = 2000;
    } catch (err) {
      if (delay >= 30000) console.warn(`[whatsapp] waiting for WhatsApp at ${WA_URL}: ${(err as Error).message}`);
      delay = Math.min(delay * 2, 60000);
    }
    setTimeout(loop, delay);
  };
  loop();
};
