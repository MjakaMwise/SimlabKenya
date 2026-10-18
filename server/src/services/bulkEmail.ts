import crypto from 'node:crypto';
import pool from '../config/postgres.js';
import { createTransporter, FROM_ADDRESS } from '../config/email.js';
import { layout, p, esc } from './emailTemplate.js';

export interface Recipient { email: string; name: string; participant?: string }

export const MAX_RECIPIENTS = 500;
// Resend allows about 2 requests a second by default; stay under it.
const SEND_GAP_MS = 600;
const SEND_TIMEOUT_MS = 15000;

export const GROUPS = [
  { id: 'ocean:all', label: 'Ocean Shujaa: all registrations' },
  { id: 'ocean:pending', label: 'Ocean Shujaa: pending' },
  { id: 'ocean:confirmed', label: 'Ocean Shujaa: confirmed' },
  { id: 'ocean:waitlisted', label: 'Ocean Shujaa: waitlisted' },
  { id: 'ocean:cancelled', label: 'Ocean Shujaa: cancelled' },
  { id: 'schools:all', label: 'Ocean Shujaa schools (administrators)' },
  { id: 'shop:customers', label: 'Shop customers' },
  { id: 'abstracts:teachers', label: 'Abstract submitters (teachers)' },
] as const;

const groupQuery = (id: string): { sql: string; params: unknown[] } | null => {
  if (id.startsWith('ocean:')) {
    const status = id.slice(6);
    const where = status === 'all' ? '' : 'WHERE status = $1';
    return {
      sql: `SELECT guardian_email AS email, guardian_name AS name, participant_name AS participant
            FROM ocean_shujaa_registrations ${where}`,
      params: status === 'all' ? [] : [status],
    };
  }
  if (id === 'schools:all') return { sql: `SELECT admin_email AS email, admin_name AS name, name AS participant FROM schools WHERE status <> 'cancelled'`, params: [] };
  if (id === 'shop:customers') return { sql: `SELECT customer_email AS email, customer_name AS name, NULL AS participant FROM orders`, params: [] };
  if (id === 'abstracts:teachers') return { sql: `SELECT teacher_email AS email, teacher_name AS name, project_title AS participant FROM abstracts`, params: [] };
  return null;
};

export const groupCounts = async () =>
  Promise.all(
    GROUPS.map(async (g) => {
      const q = groupQuery(g.id)!;
      const { rows } = await pool.query(`SELECT COUNT(DISTINCT lower(email))::int AS n FROM (${q.sql}) t`, q.params);
      return { ...g, count: rows[0].n as number };
    })
  );

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;
export const isEmail = (v: string) => v.length <= 254 && EMAIL_RE.test(v);

/** Combines groups and typed addresses into one de-duplicated list (first name found wins). */
export const resolveRecipients = async (groups: string[], addresses: string[]): Promise<Recipient[]> => {
  const seen = new Map<string, Recipient>();
  const add = (email: string, name: string, participant?: string | null) => {
    const key = email.trim().toLowerCase();
    if (!isEmail(key) || seen.has(key)) return;
    seen.set(key, { email: key, name: name?.trim() || '', participant: participant ?? undefined });
  };
  for (const a of addresses) add(a, '');
  for (const g of groups) {
    const q = groupQuery(g);
    if (!q) continue;
    const { rows } = await pool.query(q.sql, q.params);
    for (const r of rows) {
      const key = String(r.email).toLowerCase();
      const typed = seen.get(key);
      if (typed && !typed.name) { typed.name = r.name ?? ''; typed.participant = r.participant ?? undefined; }
      else add(r.email, r.name, r.participant);
    }
  }
  return [...seen.values()];
};

/** Plain text from the composer to email HTML. Merge fields are filled in after escaping. */
export const renderBody = (subject: string, body: string, r: { name: string; participant?: string }): string => {
  const fill = (t: string) =>
    t.replace(/\{\{\s*name\s*\}\}/gi, () => esc(r.name || 'there')).replace(/\{\{\s*participant\s*\}\}/gi, () => esc(r.participant || ''));
  const paragraphs = body.split(/\n{2,}/).map((chunk) => p(fill(esc(chunk)).replace(/\n/g, '<br>')));
  return layout(renderSubject(subject, r), paragraphs.join(''));
};

export function renderSubject(subject: string, r: { name: string; participant?: string }): string {
  return subject.replace(/\{\{\s*name\s*\}\}/gi, r.name || 'there').replace(/\{\{\s*participant\s*\}\}/gi, r.participant || '');
}

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`Email timeout after ${ms}ms`)), ms))]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let running = false;

// Sends every 'queued' row of a batch, one email per person, slowly enough for Resend's rate limit.
// Runs in the background after the request returns; progress is read from email_log.
export const runBatch = async (batchId: string): Promise<void> => {
  if (running) { setTimeout(() => runBatch(batchId), 3000); return; }
  running = true;
  try {
    const transporter = createTransporter();
    const { rows } = await pool.query(`SELECT id, to_email, to_name, subject, body FROM email_log WHERE batch_id = $1 AND status = 'queued' ORDER BY created_at`, [batchId]);
    for (const row of rows) {
      try {
        const data = JSON.parse(row.body) as { text: string; participant?: string };
        const who = { name: row.to_name ?? '', participant: data.participant };
        await withTimeout(
          transporter.sendMail({ from: `"SIM-Lab Kenya" <${FROM_ADDRESS}>`, to: row.to_email, subject: renderSubject(row.subject, who), html: renderBody(row.subject, data.text, who) }),
          SEND_TIMEOUT_MS
        );
        await pool.query(`UPDATE email_log SET status = 'sent', error = NULL, sent_at = now() WHERE id = $1`, [row.id]);
      } catch (err) {
        await pool.query(`UPDATE email_log SET status = 'failed', error = $2 WHERE id = $1`, [row.id, (err as Error).message.slice(0, 300)]);
      }
      await sleep(SEND_GAP_MS);
    }
  } catch (err) {
    console.error('[email] batch failed:', (err as Error).message);
    await pool.query(`UPDATE email_log SET status = 'failed', error = $2 WHERE batch_id = $1 AND status = 'queued'`, [batchId, (err as Error).message.slice(0, 300)]);
  } finally {
    running = false;
  }
};

export const queueBatch = async (sentBy: string, subject: string, text: string, recipients: Recipient[]): Promise<string> => {
  const batchId = crypto.randomUUID();
  for (const r of recipients) {
    await pool.query(
      `INSERT INTO email_log (batch_id, sent_by, to_email, to_name, subject, body) VALUES ($1,$2,$3,$4,$5,$6)`,
      [batchId, sentBy, r.email, r.name || null, subject, JSON.stringify({ text, participant: r.participant })]
    );
  }
  runBatch(batchId).catch((e) => console.error('[email] runBatch:', e));
  return batchId;
};
