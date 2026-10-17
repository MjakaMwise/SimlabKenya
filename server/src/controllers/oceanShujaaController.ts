import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/postgres.js';
import { postEvent } from '../services/chat.js';
import { sendOceanShujaaRegistrationEmail, sendOceanShujaaStatusEmail } from '../services/emailService.js';

const LEVELS = ['primary', 'junior_secondary', 'senior_secondary', 'college', 'group', 'other'] as const;
const STATUSES = ['pending', 'confirmed', 'waitlisted', 'cancelled'] as const;

const createSchema = z.object({
  participantName: z.string().trim().min(2).max(120),
  participantAge: z.coerce.number().int().min(3).max(99).optional().nullable(),
  level: z.enum(LEVELS),
  institution: z.string().trim().min(2).max(160),
  guardianName: z.string().trim().min(2).max(120),
  guardianPhone: z.string().trim().min(7).max(25).regex(/^[0-9+\-()\s]+$/, 'Invalid phone number'),
  guardianEmail: z.string().trim().email().max(160),
  groupSize: z.coerce.number().int().min(1).max(500).default(1),
  notes: z.string().trim().max(2000).optional().nullable(),
  website: z.string().max(0).optional(), // honeypot: real users leave this empty
});

const updateSchema = z
  .object({
    status: z.enum(STATUSES).optional(),
    adminNotes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.adminNotes !== undefined, 'Nothing to update');

const COLUMNS = `id, participant_name AS "participantName", participant_age AS "participantAge",
  level, institution, guardian_name AS "guardianName", guardian_phone AS "guardianPhone",
  guardian_email AS "guardianEmail", group_size AS "groupSize", notes, status,
  admin_notes AS "adminNotes", created_at AS "createdAt", updated_at AS "updatedAt"`;

const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

// POST /api/ocean-shujaa/registrations — public
export const createRegistration = async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    // Bots filling the honeypot get a fake success so they don't retry.
    if (req.body?.website) return res.status(201).json({ success: true });
    const details = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({ error: 'Validation failed', details });
  }
  const d = parsed.data;
  const { rows: created } = await pool.query(
    `INSERT INTO ocean_shujaa_registrations
       (participant_name, participant_age, level, institution, guardian_name,
        guardian_phone, guardian_email, group_size, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [d.participantName, d.participantAge ?? null, d.level, d.institution, d.guardianName,
     d.guardianPhone, d.guardianEmail, d.groupSize, d.notes || null]
  );
  postEvent('ocean-shujaa',
    `New registration: ${d.participantName}, ${d.institution} (${d.groupSize} ${d.groupSize === 1 ? 'participant' : 'participants'})`,
    { type: 'registration', id: created[0].id, label: d.participantName });
  // Email failures must not fail a registration that is already saved.
  sendOceanShujaaRegistrationEmail({
    participantName: d.participantName, level: d.level, institution: d.institution,
    guardianName: d.guardianName, guardianEmail: d.guardianEmail, guardianPhone: d.guardianPhone,
    groupSize: d.groupSize, status: 'pending',
  }).catch((err) =>
    console.error('Ocean Shujaa registration email failed:', err)
  );
  res.status(201).json({ success: true });
};

// GET /api/ocean-shujaa/admin/registrations?status=&search=
export const listRegistrations = async (req: Request, res: Response) => {
  const where: string[] = [];
  const params: unknown[] = [];
  const status = String(req.query.status ?? '');
  if ((STATUSES as readonly string[]).includes(status)) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  const search = String(req.query.search ?? '').trim().slice(0, 100);
  if (search) {
    params.push(`%${search.replace(/[%_\\]/g, '\\$&')}%`);
    where.push(`(participant_name ILIKE $${params.length} OR institution ILIKE $${params.length}
      OR guardian_name ILIKE $${params.length} OR guardian_email ILIKE $${params.length}
      OR guardian_phone ILIKE $${params.length})`);
  }
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM ocean_shujaa_registrations
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY created_at DESC LIMIT 1000`,
    params
  );
  res.json({ registrations: rows });
};

// GET /api/ocean-shujaa/admin/summary
export const getSummary = async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT status, COUNT(*)::int AS registrations, COALESCE(SUM(group_size),0)::int AS participants
     FROM ocean_shujaa_registrations GROUP BY status`
  );
  const summary: Record<string, { registrations: number; participants: number }> = {};
  for (const s of STATUSES) summary[s] = { registrations: 0, participants: 0 };
  for (const r of rows) summary[r.status] = { registrations: r.registrations, participants: r.participants };
  res.json({ summary });
};

// PATCH /api/ocean-shujaa/admin/registrations/:id
export const updateRegistration = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid id' });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed' });

  const sets: string[] = [];
  const params: unknown[] = [];
  if (parsed.data.status !== undefined) { params.push(parsed.data.status); sets.push(`status = $${params.length}`); }
  if (parsed.data.adminNotes !== undefined) { params.push(parsed.data.adminNotes || null); sets.push(`admin_notes = $${params.length}`); }
  params.push(id);
  const previous = parsed.data.status !== undefined
    ? (await pool.query('SELECT status FROM ocean_shujaa_registrations WHERE id = $1', [id])).rows[0]?.status
    : undefined;
  const { rows } = await pool.query(
    `UPDATE ocean_shujaa_registrations SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING ${COLUMNS}`,
    params
  );
  if (!rows.length) return res.status(404).json({ error: 'Registration not found' });
  const r = rows[0];
  if (parsed.data.status !== undefined && previous !== r.status) {
    sendOceanShujaaStatusEmail({ ...r, status: r.status }).catch((err) =>
      console.error('Ocean Shujaa status email failed:', err)
    );
  }
  res.json({ registration: r });
};

// DELETE /api/ocean-shujaa/admin/registrations/:id
export const deleteRegistration = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid id' });
  const { rowCount } = await pool.query('DELETE FROM ocean_shujaa_registrations WHERE id = $1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'Registration not found' });
  res.json({ success: true });
};

// GET /api/ocean-shujaa/admin/export.csv
export const exportCsv = async (_req: Request, res: Response) => {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM ocean_shujaa_registrations ORDER BY created_at DESC`);
  const headers = ['createdAt', 'status', 'participantName', 'participantAge', 'level', 'institution',
    'guardianName', 'guardianPhone', 'guardianEmail', 'groupSize', 'notes', 'adminNotes'];
  // Prefix formula-triggering characters so spreadsheets don't execute user input.
  const cell = (v: unknown) => {
    let s = v instanceof Date ? v.toISOString() : v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => cell(r[h])).join(','))].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ocean-shujaa-registrations.csv"');
  res.send(csv);
};
