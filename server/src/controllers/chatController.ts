import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/postgres.js';
import { publicKey, pushEnabled } from '../services/push.js';
import {
  Channel, channelById, channelsFor, canAccess, membersOf, displayName, notifyMention, notifyTask,
} from '../services/chat.js';

const TS = `to_char(%s AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const ts = (col: string) => TS.replace('%s', col);
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

// Loads the channel and checks the signed-in person may see it. Sends the error response itself.
const channelFor = (req: Request, res: Response): Channel | null => {
  const ch = channelById(String(req.params.channel ?? req.body?.channel ?? req.query.channel ?? ''));
  if (!ch || !canAccess(req.user, ch)) {
    res.status(404).json({ error: 'Channel not found' });
    return null;
  }
  return ch;
};

const MESSAGE_SQL = `
  SELECT m.id, m.channel, m.body, m.mentions, m.is_event AS "isEvent",
         m.ref_type AS "refType", m.ref_id AS "refId", m.ref_label AS "refLabel",
         ${ts('m.created_at')} AS "createdAt",
         m.author_id AS "authorId", coalesce(nullif(trim(u.name), ''), split_part(u.email, '@', 1)) AS "authorName",
         t.id AS "taskId", t.status AS "taskStatus", t.title AS "taskTitle", t.assignee_id AS "taskAssigneeId",
         coalesce(nullif(trim(a.name), ''), split_part(a.email, '@', 1)) AS "taskAssigneeName"
  FROM chat_messages m
  LEFT JOIN admin_users u ON u.id = m.author_id
  LEFT JOIN chat_tasks t ON t.message_id = m.id
  LEFT JOIN admin_users a ON a.id = t.assignee_id`;

// GET /api/chat/channels
export const listChannels = async (req: Request, res: Response) => {
  const mine = channelsFor(req.user!);
  const { rows } = await pool.query(
    `SELECT m.channel,
            count(*) FILTER (WHERE m.created_at > coalesce(r.last_read_at, 'epoch') AND m.author_id IS DISTINCT FROM $1)::int AS unread,
            count(*) FILTER (WHERE m.created_at > coalesce(r.last_read_at, 'epoch') AND $1 = ANY(m.mentions))::int AS mentions
     FROM chat_messages m
     LEFT JOIN chat_reads r ON r.user_id = $1 AND r.channel = m.channel
     WHERE m.channel = ANY($2::text[])
     GROUP BY m.channel`,
    [req.user!.id, mine.map((c) => c.id)]
  );
  const open = await pool.query(
    `SELECT count(*)::int AS n FROM chat_tasks WHERE assignee_id = $1 AND status = 'open'`,
    [req.user!.id]
  );
  const by = new Map(rows.map((r) => [r.channel, r]));
  res.json({
    channels: mine.map((c) => ({ id: c.id, name: c.name, description: c.description, restricted: c.area !== null, unread: by.get(c.id)?.unread ?? 0, mentions: by.get(c.id)?.mentions ?? 0 })),
    openTasks: open.rows[0].n,
  });
};

// GET /api/chat/channels/:channel/members
export const listMembers = async (req: Request, res: Response) => {
  const ch = channelFor(req, res);
  if (!ch) return;
  const people = await membersOf(ch);
  res.json(people.map((p) => ({ id: p.id, name: displayName(p), role: p.role })));
};

// GET /api/chat/channels/:channel/messages?after=<iso>&before=<iso>&limit=
export const listMessages = async (req: Request, res: Response) => {
  const ch = channelFor(req, res);
  if (!ch) return;
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '60'), 10) || 60, 1), 200);
  const after = typeof req.query.after === 'string' && !Number.isNaN(Date.parse(req.query.after)) ? req.query.after : null;
  const before = typeof req.query.before === 'string' && !Number.isNaN(Date.parse(req.query.before)) ? req.query.before : null;
  const params: unknown[] = [ch.id];
  let where = 'WHERE m.channel = $1';
  if (after) { params.push(after); where += ` AND m.created_at > $${params.length}::timestamptz`; }
  if (before) { params.push(before); where += ` AND m.created_at < $${params.length}::timestamptz`; }
  const { rows } = await pool.query(
    `${MESSAGE_SQL} ${where} ORDER BY m.created_at ${after ? 'ASC' : 'DESC'} LIMIT ${limit}`,
    params
  );
  res.json(after ? rows : rows.reverse());
};

const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  mentions: z.array(z.string().uuid()).max(20).default([]),
});

// POST /api/chat/channels/:channel/messages
export const postMessage = async (req: Request, res: Response) => {
  const ch = channelFor(req, res);
  if (!ch) return;
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Write a message first.' });
  const { body } = parsed.data;
  // Only people who can read the channel can be mentioned in it.
  const members = await membersOf(ch);
  const ids = [...new Set(parsed.data.mentions)].filter((id) => members.some((m) => m.id === id));
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (channel, author_id, body, mentions) VALUES ($1,$2,$3,$4::uuid[]) RETURNING id`,
    [ch.id, req.user!.id, body, ids]
  );
  const [msg] = (await pool.query(`${MESSAGE_SQL} WHERE m.id = $1`, [rows[0].id])).rows;
  notifyMention(ch, displayName(req.user!), body, ids, req.user!.id).catch((e) => console.error('[chat] mention push failed:', e.message));
  res.status(201).json(msg);
};

// POST /api/chat/channels/:channel/read
export const markRead = async (req: Request, res: Response) => {
  const ch = channelFor(req, res);
  if (!ch) return;
  await pool.query(
    `INSERT INTO chat_reads (user_id, channel, last_read_at) VALUES ($1,$2,now())
     ON CONFLICT (user_id, channel) DO UPDATE SET last_read_at = now()`,
    [req.user!.id, ch.id]
  );
  res.json({ success: true });
};

// ── Tasks ────────────────────────────────────────────────────────────────────

const TASK_SQL = `
  SELECT t.id, t.channel, t.message_id AS "messageId", t.title, t.status,
         to_char(t.due_date, 'YYYY-MM-DD') AS "dueDate",
         ${ts('t.created_at')} AS "createdAt", ${ts('t.completed_at')} AS "completedAt",
         t.assignee_id AS "assigneeId", coalesce(nullif(trim(a.name), ''), split_part(a.email, '@', 1)) AS "assigneeName",
         t.created_by AS "createdBy", coalesce(nullif(trim(c.name), ''), split_part(c.email, '@', 1)) AS "createdByName"
  FROM chat_tasks t
  JOIN admin_users a ON a.id = t.assignee_id
  LEFT JOIN admin_users c ON c.id = t.created_by`;

// GET /api/chat/tasks?scope=mine|channel&channel=&status=open|done
export const listTasks = async (req: Request, res: Response) => {
  const params: unknown[] = [];
  const where: string[] = [];
  if (req.query.scope === 'channel') {
    const ch = channelFor(req, res);
    if (!ch) return;
    params.push(ch.id);
    where.push(`t.channel = $${params.length}`);
  } else {
    params.push(req.user!.id);
    where.push(`t.assignee_id = $${params.length}`);
  }
  const status = String(req.query.status ?? '');
  if (status === 'open' || status === 'done') { params.push(status); where.push(`t.status = $${params.length}`); }
  const { rows } = await pool.query(
    `${TASK_SQL} WHERE ${where.join(' AND ')}
     ORDER BY (t.status = 'done'), t.due_date NULLS LAST, t.created_at DESC LIMIT 200`,
    params
  );
  // Someone who lost access to a channel still sees tasks assigned to them, but not its other tasks.
  res.json(rows.filter((r) => { const c = channelById(r.channel); return r.assigneeId === req.user!.id || (c && canAccess(req.user, c)); }));
};

const taskSchema = z.object({
  channel: z.string(),
  title: z.string().trim().min(1).max(300),
  assigneeId: z.string().uuid(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  messageId: z.string().uuid().nullable().optional(),
});

// Writes a short line in the channel so everyone can see who took what.
const announce = (channel: string, authorId: string, text: string, taskId: string, label: string) =>
  pool.query(
    `INSERT INTO chat_messages (channel, author_id, body, ref_type, ref_id, ref_label, is_event) VALUES ($1,$2,$3,'task',$4,$5,false)`,
    [channel, authorId, text, taskId, label]
  );

// POST /api/chat/tasks
export const createTask = async (req: Request, res: Response) => {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Give the task a title and choose who it is for.' });
  const d = parsed.data;
  const ch = channelById(d.channel);
  if (!ch || !canAccess(req.user, ch)) return res.status(404).json({ error: 'Channel not found' });
  const members = await membersOf(ch);
  const assignee = members.find((m) => m.id === d.assigneeId);
  if (!assignee) return res.status(400).json({ error: 'That person cannot see this channel.' });
  if (d.messageId) {
    const ok = await pool.query('SELECT 1 FROM chat_messages WHERE id = $1 AND channel = $2', [d.messageId, ch.id]);
    if (!ok.rowCount) return res.status(400).json({ error: 'That message is not in this channel.' });
  }
  const { rows } = await pool.query(
    `INSERT INTO chat_tasks (channel, message_id, title, assignee_id, created_by, due_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [ch.id, d.messageId ?? null, d.title, assignee.id, req.user!.id, d.dueDate ?? null]
  );
  const me = displayName(req.user!);
  const self = assignee.id === req.user!.id;
  await announce(ch.id, req.user!.id, self ? `${me} took on: ${d.title}` : `${me} assigned ${displayName(assignee)}: ${d.title}`, rows[0].id, d.title);
  notifyTask(assignee.id, req.user!.id, me, d.title, ch.id).catch((e) => console.error('[chat] task push failed:', e.message));
  res.status(201).json((await pool.query(`${TASK_SQL} WHERE t.id = $1`, [rows[0].id])).rows[0]);
};

const taskUpdateSchema = z.object({
  status: z.enum(['open', 'done']).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  title: z.string().trim().min(1).max(300).optional(),
}).refine((v) => Object.keys(v).length > 0, 'Nothing to update');

// PATCH /api/chat/tasks/:id — the assignee, whoever created it, or an administrator
export const updateTask = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const parsed = taskUpdateSchema.safeParse(req.body);
  if (!isUuid(id) || !parsed.success) return res.status(400).json({ error: 'Invalid update' });
  const { rows } = await pool.query('SELECT * FROM chat_tasks WHERE id = $1', [id]);
  const t = rows[0];
  const ch = t && channelById(t.channel);
  if (!t || !ch) return res.status(404).json({ error: 'Task not found' });
  const u = req.user!;
  if (!(u.role === 'admin' || t.assignee_id === u.id || t.created_by === u.id)) {
    return res.status(403).json({ error: 'Only the assignee or whoever created the task can change it.' });
  }
  const d = parsed.data;
  let assigneeId = t.assignee_id as string;
  if (d.assigneeId && d.assigneeId !== t.assignee_id) {
    const target = (await membersOf(ch)).find((m) => m.id === d.assigneeId);
    if (!target) return res.status(400).json({ error: 'That person cannot see this channel.' });
    assigneeId = target.id;
  }
  const status = d.status ?? t.status;
  const title = d.title ?? t.title;
  await pool.query(
    `UPDATE chat_tasks SET title = $2, assignee_id = $3, due_date = $4, status = $5,
       completed_at = CASE WHEN $5 = 'done' THEN coalesce(completed_at, now()) ELSE NULL END WHERE id = $1`,
    [id, title, assigneeId, d.dueDate !== undefined ? d.dueDate : t.due_date, status]
  );
  const me = displayName(u);
  if (status === 'done' && t.status !== 'done') await announce(ch.id, u.id, `${me} finished: ${title}`, id, title);
  if (assigneeId !== t.assignee_id) {
    const to = (await membersOf(ch)).find((m) => m.id === assigneeId);
    await announce(ch.id, u.id, `${me} handed over to ${to ? displayName(to) : 'someone'}: ${title}`, id, title);
    notifyTask(assigneeId, u.id, me, title, ch.id).catch((e) => console.error('[chat] task push failed:', e.message));
  }
  res.json((await pool.query(`${TASK_SQL} WHERE t.id = $1`, [id])).rows[0]);
};

// ── Push notifications ───────────────────────────────────────────────────────

// GET /api/chat/push/key
export const getPushKey = (_req: Request, res: Response) => res.json({ enabled: pushEnabled, publicKey: publicKey() });

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

// POST /api/chat/push/subscribe
export const subscribePush = async (req: Request, res: Response) => {
  if (!pushEnabled) return res.status(503).json({ error: 'Push notifications are not set up on the server.' });
  const parsed = subSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid subscription' });
  const { endpoint, keys } = parsed.data;
  // A device belongs to whoever signed in on it last.
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1,$2,$3,$4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [req.user!.id, endpoint, keys.p256dh, keys.auth]
  );
  res.status(201).json({ success: true });
};

// POST /api/chat/push/unsubscribe
export const unsubscribePush = async (req: Request, res: Response) => {
  const endpoint = z.string().url().safeParse(req.body?.endpoint);
  if (endpoint.success) await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [endpoint.data, req.user!.id]);
  res.json({ success: true });
};
