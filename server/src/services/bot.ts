import pool from '../config/postgres.js';
import { reply, alertStaff, last9 } from './whatsapp.js';

interface Node { id: string; text: string; options: { key: string; goto: string }[]; input: 'order' | 'registration' | null; action: 'human' | null }
interface Conv { id: string; phone: string; name: string | null; bot_state: string; bot_active: boolean; needs_human: boolean; assigned_to: string | null }

interface Hours { enabled: boolean; start: string; end: string; days: number[] }

const FOOTER = '\n\nReply 0 for the main menu, or 5 to talk to a person.';
const HUMAN_WORDS = new Set(['agent', 'human', 'person', 'staff', 'help']);

const setting = async <T>(key: string, fallback: T): Promise<T> => {
  const { rows } = await pool.query('SELECT value FROM site_settings WHERE key = $1', [key]);
  return rows[0] ? (rows[0].value as T) : fallback;
};

// Business hours are in Nairobi time. With hours switched on, the bot only answers outside them.
const insideBusinessHours = (h: Hours): boolean => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Nairobi' }));
  if (!h.days.includes(now.getDay())) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
  return mins >= toMin(h.start) && mins < toMin(h.end);
};

const node = async (id: string): Promise<Node | null> => {
  const { rows } = await pool.query('SELECT id, text, options, input, action FROM bot_nodes WHERE id = $1', [id]);
  return rows[0] ?? null;
};

// Details are only shown when the order or registration belongs to the number that is asking.
const lookupOrder = async (conv: Conv, input: string): Promise<string | null> => {
  const { rows } = await pool.query(
    `SELECT order_number, order_status, payment_status, items, total_amount, customer_phone FROM orders WHERE upper(order_number) = upper($1)`,
    [input.trim()]
  );
  const o = rows[0];
  if (!o || last9(o.customer_phone) !== last9(conv.phone)) return null;
  const items = (o.items as { name: string; quantity: number }[]).map((i) => `${i.name} x${i.quantity}`).join(', ');
  return `Order ${o.order_number}\nStatus: ${o.order_status}\nPayment: ${o.payment_status}\nItems: ${items}\nTotal: KES ${Number(o.total_amount).toLocaleString()}`;
};

const lookupRegistration = async (conv: Conv, input: string): Promise<string | null> => {
  const q = input.trim().toLowerCase();
  const { rows } = await pool.query(
    `SELECT participant_name, institution, status, guardian_phone, guardian_email FROM ocean_shujaa_registrations
     WHERE lower(guardian_email) = $1 OR right(regexp_replace(guardian_phone, '\\D', '', 'g'), 9) = $2
     ORDER BY created_at DESC LIMIT 5`,
    [q, last9(q)]
  );
  const mine = rows.filter((r) => last9(r.guardian_phone) === last9(conv.phone));
  if (!mine.length) return null;
  return 'Ocean Shujaa\n' + mine.map((r) => `${r.participant_name} (${r.institution}): ${r.status}`).join('\n');
};

const setState = (id: string, patch: { state?: string; botActive?: boolean; needsHuman?: boolean }) =>
  pool.query(
    `UPDATE wa_conversations SET bot_state = COALESCE($2, bot_state), bot_active = COALESCE($3, bot_active), needs_human = COALESCE($4, needs_human) WHERE id = $1`,
    [id, patch.state ?? null, patch.botActive ?? null, patch.needsHuman ?? null]
  );

const goTo = async (conv: Conv, id: string): Promise<void> => {
  const n = await node(id);
  if (!n) return void (await goTo(conv, 'main'));
  await reply(conv, 'bot', n.text);
  if (n.action === 'human') {
    await setState(conv.id, { state: 'main', botActive: false, needsHuman: true });
    await alertStaff(conv, 'Asked to talk to a person', `human-${conv.id}`);
  } else {
    await setState(conv.id, { state: n.id });
  }
};

/** Returns true when the bot answered (so staff need no alert for this message). */
export const handleIncoming = async (conv: Conv, text: string): Promise<boolean> => {
  if (!conv.bot_active || conv.needs_human) return false;
  if (!(await setting<boolean>('wa_bot_enabled', true))) return false;
  const hours = await setting<Hours>('wa_bot_hours', { enabled: false, start: '08:00', end: '17:00', days: [1, 2, 3, 4, 5] });
  if (hours.enabled && insideBusinessHours(hours)) return false;

  const t = text.trim().toLowerCase();
  const current = (await node(conv.bot_state)) ?? (await node('main'));
  if (!current) return false;

  if (t === '0' || t === 'menu') { await goTo(conv, 'main'); return true; }
  if (HUMAN_WORDS.has(t)) { await goTo(conv, 'human'); return true; }

  if (current.input) {
    const found = current.input === 'order' ? await lookupOrder(conv, text) : await lookupRegistration(conv, text);
    if (found) {
      await reply(conv, 'bot', found + FOOTER);
      await setState(conv.id, { state: 'main' });
    } else {
      await reply(conv, 'bot', `We could not find that for this WhatsApp number. Check it and try again, or reply 0 for the main menu, or 5 to talk to a person.`);
    }
    return true;
  }

  const option = current.options.find((o) => o.key === t);
  if (option) { await goTo(conv, option.goto); return true; }

  // Anything else: on the main menu greet with the menu, elsewhere repeat the screen.
  if (current.id === 'main') { await goTo(conv, 'main'); return true; }
  await reply(conv, 'bot', `Please reply with a number from the list.\n\n${current.text}`);
  return true;
};
