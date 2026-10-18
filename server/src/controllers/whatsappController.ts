import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/postgres.js';
import { getStatus, normalizePhone, reply, upsertConversation } from '../services/whatsapp.js';

const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

const CONV_COLUMNS = `c.id, c.phone, c.name, c.status, c.assigned_to AS "assignedTo", COALESCE(u.name, u.email) AS "assignedName",
  c.bot_active AS "botActive", c.needs_human AS "needsHuman", c.unread, c.last_message_at AS "lastMessageAt",
  c.last_message_preview AS "lastMessagePreview"`;

// GET /api/whatsapp/status
export const status = async (_req: Request, res: Response) => {
  res.json(await getStatus());
};

// GET /api/whatsapp/conversations?status=open|resolved|mine|human&q=
export const listConversations = async (req: Request, res: Response) => {
  const where: string[] = [];
  const params: unknown[] = [];
  const f = String(req.query.status ?? '');
  if (f === 'open' || f === 'resolved') { params.push(f); where.push(`c.status = $${params.length}`); }
  if (f === 'mine') { params.push(req.user!.id); where.push(`c.assigned_to = $${params.length}`); }
  if (f === 'human') where.push(`c.needs_human AND c.status = 'open'`);
  const q = String(req.query.q ?? '').trim().slice(0, 60);
  if (q) { params.push(`%${q.replace(/[%_\\]/g, '\\$&')}%`); where.push(`(c.phone LIKE $${params.length} OR c.name ILIKE $${params.length})`); }
  const { rows } = await pool.query(
    `SELECT ${CONV_COLUMNS} FROM wa_conversations c LEFT JOIN admin_users u ON u.id = c.assigned_to
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY c.last_message_at DESC LIMIT 200`,
    params
  );
  res.json({ conversations: rows });
};

// GET /api/whatsapp/conversations/:id/messages?after=ISO
export const listMessages = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid id' });
  const after = req.query.after ? new Date(String(req.query.after)) : null;
  if (after && isNaN(after.getTime())) return res.status(400).json({ error: 'Invalid time' });
  const { rows } = await pool.query(
    `SELECT m.id, m.direction, m.sender, m.body, m.status, m.error, m.created_at AS "createdAt", COALESCE(u.name, u.email) AS "staffName"
     FROM wa_messages m LEFT JOIN admin_users u ON u.id = m.staff_id
     WHERE m.conversation_id = $1 ${after ? 'AND m.created_at > $2' : ''}
     ORDER BY m.created_at DESC LIMIT 300`,
    after ? [id, after] : [id]
  );
  res.json({ messages: rows.reverse() });
};

// POST /api/whatsapp/conversations/:id/read
export const markRead = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid id' });
  await pool.query('UPDATE wa_conversations SET unread = 0 WHERE id = $1', [id]);
  res.json({ success: true });
};

const startSchema = z.object({ phone: z.string().min(7).max(25), name: z.string().trim().max(120).optional() });

// POST /api/whatsapp/conversations — opens (or creates) the chat with a number
export const startConversation = async (req: Request, res: Response) => {
  const parsed = startSchema.safeParse(req.body);
  const phone = parsed.success ? normalizePhone(parsed.data.phone) : null;
  if (!parsed.success || !phone) return res.status(400).json({ error: 'Enter a valid phone number, for example 0712 345 678' });
  const conv = await upsertConversation(phone, parsed.data.name);
  res.json({ id: conv.id });
};

const sendSchema = z.object({ body: z.string().trim().min(1).max(4000) });

// POST /api/whatsapp/conversations/:id/messages — a person replies. The bot stays quiet in this chat from then on.
export const sendMessage = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid id' });
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Write a message first' });
  const { rows } = await pool.query('SELECT id, phone FROM wa_conversations WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Conversation not found' });
  try {
    const message = await reply(rows[0], 'staff', parsed.data.body, req.user!.id);
    await pool.query(
      `UPDATE wa_conversations SET bot_active = false, needs_human = false, unread = 0,
         assigned_to = COALESCE(assigned_to, $2), status = 'open' WHERE id = $1`,
      [id, req.user!.id]
    );
    res.status(201).json({ message });
  } catch (err) {
    res.status(502).json({ error: `Could not send: ${(err as Error).message}` });
  }
};

const patchSchema = z.object({
  assignedTo: z.string().uuid().nullable().optional(),
  status: z.enum(['open', 'resolved']).optional(),
  botActive: z.boolean().optional(),
});

// PATCH /api/whatsapp/conversations/:id
export const updateConversation = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid id' });
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });
  const d = parsed.data;
  const sets: string[] = [];
  const params: unknown[] = [id];
  const add = (col: string, v: unknown) => { params.push(v); sets.push(`${col} = $${params.length}`); };
  if (d.assignedTo !== undefined) add('assigned_to', d.assignedTo);
  if (d.status !== undefined) add('status', d.status);
  if (d.botActive !== undefined) {
    add('bot_active', d.botActive);
    if (d.botActive) { sets.push(`needs_human = false`); sets.push(`bot_state = 'main'`); }
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  const { rowCount } = await pool.query(`UPDATE wa_conversations SET ${sets.join(', ')} WHERE id = $1`, params);
  if (!rowCount) return res.status(404).json({ error: 'Conversation not found' });
  const { rows } = await pool.query(`SELECT ${CONV_COLUMNS} FROM wa_conversations c LEFT JOIN admin_users u ON u.id = c.assigned_to WHERE c.id = $1`, [id]);
  res.json({ conversation: rows[0] });
};

// GET /api/whatsapp/members — people a chat can be assigned to
export const members = async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT id, COALESCE(name, email) AS name FROM admin_users
     WHERE active AND (role = 'admin' OR permissions && ARRAY['whatsapp:manage']) ORDER BY lower(COALESCE(name, email))`
  );
  res.json({ members: rows });
};

// ── Bot settings and menu (administrators) ───────────────────────────────────
const hoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
  days: z.array(z.number().int().min(0).max(6)).max(7),
});

// GET /api/whatsapp/bot/settings
export const getBotSettings = async (_req: Request, res: Response) => {
  const { rows } = await pool.query(`SELECT key, value FROM site_settings WHERE key IN ('wa_bot_enabled', 'wa_bot_hours')`);
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({ enabled: byKey.wa_bot_enabled !== false, hours: byKey.wa_bot_hours });
};

// PUT /api/whatsapp/bot/settings
export const putBotSettings = async (req: Request, res: Response) => {
  const parsed = z.object({ enabled: z.boolean(), hours: hoursSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid settings' });
  const put = (key: string, value: unknown) =>
    pool.query(`INSERT INTO site_settings (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [key, JSON.stringify(value)]);
  await put('wa_bot_enabled', parsed.data.enabled);
  await put('wa_bot_hours', parsed.data.hours);
  res.json({ success: true });
};

const nodeSchema = z.object({
  text: z.string().trim().min(1).max(1500),
  options: z.array(z.object({ key: z.string().trim().min(1).max(10).toLowerCase(), goto: z.string().trim().min(1).max(60) })).max(12),
});

// GET /api/whatsapp/bot/nodes
export const listNodes = async (_req: Request, res: Response) => {
  const { rows } = await pool.query('SELECT id, text, options, input, action FROM bot_nodes ORDER BY sort, id');
  res.json({ nodes: rows });
};

// PUT /api/whatsapp/bot/nodes/:id — wording and options; lookups and hand-off stay as built
export const putNode = async (req: Request, res: Response) => {
  const parsed = nodeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid menu' });
  const { rows: all } = await pool.query('SELECT id FROM bot_nodes');
  const ids = new Set(all.map((r) => r.id as string));
  const missing = parsed.data.options.find((o) => !ids.has(o.goto));
  if (missing) return res.status(400).json({ error: `Option "${missing.key}" points to "${missing.goto}", which does not exist` });
  const { rowCount } = await pool.query('UPDATE bot_nodes SET text = $2, options = $3::jsonb WHERE id = $1', [String(req.params.id), parsed.data.text, JSON.stringify(parsed.data.options)]);
  if (!rowCount) return res.status(404).json({ error: 'Screen not found' });
  res.json({ success: true });
};
