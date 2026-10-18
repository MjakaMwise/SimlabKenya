import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/postgres.js';
import {
  GROUPS, MAX_RECIPIENTS, groupCounts, resolveRecipients, queueBatch, runBatch, renderBody, renderSubject, isEmail,
} from '../services/bulkEmail.js';

const composeSchema = z.object({
  subject: z.string().trim().min(2).max(200),
  body: z.string().trim().min(2).max(20000),
  groups: z.array(z.string()).max(GROUPS.length).default([]),
  addresses: z.array(z.string().trim().toLowerCase()).max(MAX_RECIPIENTS).default([]),
});

const previewSchema = composeSchema.pick({ subject: true, body: true });

// GET /api/email/groups
export const listGroups = async (_req: Request, res: Response) => {
  res.json({ groups: await groupCounts() });
};

// POST /api/email/preview — how the first line of the message looks for a sample recipient
export const preview = async (req: Request, res: Response) => {
  const parsed = previewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Add a subject and a message first' });
  const sample = { name: 'Amina', participant: 'Baraka' };
  res.json({ subject: renderSubject(parsed.data.subject, sample), html: renderBody(parsed.data.subject, parsed.data.body, sample) });
};

// POST /api/email/send — queues one email per recipient and returns at once; sending continues in the background.
export const send = async (req: Request, res: Response) => {
  const parsed = composeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
  const { subject, body, groups, addresses } = parsed.data;
  const bad = addresses.filter((a) => !isEmail(a));
  if (bad.length) return res.status(400).json({ error: `Not a valid email address: ${bad[0]}` });
  const recipients = await resolveRecipients(groups, addresses);
  if (!recipients.length) return res.status(400).json({ error: 'No recipients. Add an address or pick a group.' });
  if (recipients.length > MAX_RECIPIENTS) return res.status(400).json({ error: `Too many recipients (${recipients.length}). The limit is ${MAX_RECIPIENTS} per send.` });
  const batchId = await queueBatch(req.user!.id, subject, body, recipients);
  res.status(202).json({ batchId, recipients: recipients.length });
};

// POST /api/email/count — how many people a selection reaches, for the confirm step
export const count = async (req: Request, res: Response) => {
  const parsed = composeSchema.pick({ groups: true, addresses: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request' });
  const recipients = await resolveRecipients(parsed.data.groups, parsed.data.addresses.filter(isEmail));
  res.json({ count: recipients.length, sample: recipients.slice(0, 5).map((r) => r.email) });
};

// GET /api/email/log — one row per batch, newest first
export const listBatches = async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT l.batch_id AS "batchId", MIN(l.subject) AS subject, MIN(l.created_at) AS "createdAt",
            COALESCE(MIN(u.name), MIN(u.email)) AS "sentBy",
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE l.status = 'sent')::int AS sent,
            COUNT(*) FILTER (WHERE l.status = 'failed')::int AS failed,
            COUNT(*) FILTER (WHERE l.status = 'queued')::int AS queued
     FROM email_log l LEFT JOIN admin_users u ON u.id = l.sent_by
     GROUP BY l.batch_id ORDER BY MIN(l.created_at) DESC LIMIT 50`
  );
  res.json({ batches: rows });
};

// GET /api/email/log/:batchId
export const batchDetail = async (req: Request, res: Response) => {
  const id = String(req.params.batchId);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid id' });
  const { rows } = await pool.query(
    `SELECT id, to_email AS "toEmail", to_name AS "toName", status, error, sent_at AS "sentAt" FROM email_log WHERE batch_id = $1 ORDER BY created_at LIMIT 1000`,
    [id]
  );
  res.json({ recipients: rows });
};

// POST /api/email/log/:batchId/retry — re-queues failed sends
export const retry = async (req: Request, res: Response) => {
  const id = String(req.params.batchId);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid id' });
  const { rowCount } = await pool.query(`UPDATE email_log SET status = 'queued', error = NULL WHERE batch_id = $1 AND status = 'failed'`, [id]);
  if (!rowCount) return res.status(404).json({ error: 'Nothing to retry in this batch' });
  runBatch(id).catch((e) => console.error('[email] retry:', e));
  res.json({ retried: rowCount });
};
