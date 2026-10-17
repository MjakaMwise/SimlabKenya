import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/postgres.js';
import { hashPassword } from '../services/authService.js';
import { normalizePermissions } from '../services/permissions.js';

const COLS = 'id, email, name, role, permissions, active, created_at, updated_at';

const permissionsSchema = z.array(z.string()).max(20).transform(normalizePermissions);
const createSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().trim().min(2).max(120),
  permissions: permissionsSchema,
});
const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  permissions: permissionsSchema.optional(),
  active: z.boolean().optional(),
});

const tempPassword = () => crypto.randomBytes(12).toString('base64url');

// Staff-management routes only ever touch staff rows; administrators are managed from the server.
const findStaff = async (id: string) => {
  const { rows } = await pool.query(`SELECT ${COLS} FROM admin_users WHERE id = $1 AND role = 'staff'`, [id]);
  return rows[0];
};

// GET /api/admin/staff
export const listStaff = async (_req: Request, res: Response) => {
  const { rows } = await pool.query(`SELECT ${COLS} FROM admin_users ORDER BY role, created_at`);
  res.json(rows);
};

// POST /api/admin/staff — returns the temporary password once; it is never stored in plain text.
export const createStaff = async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
  const { email, name, permissions } = parsed.data;

  const password = tempPassword();
  const { rows } = await pool.query(
    `INSERT INTO admin_users (email, name, role, permissions, password_hash)
     VALUES ($1, $2, 'staff', $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING ${COLS}`,
    [email, name, permissions, hashPassword(password)]
  );
  if (!rows[0]) return res.status(409).json({ error: 'An account with this email already exists' });
  res.status(201).json({ staff: rows[0], temporaryPassword: password });
};

// PATCH /api/admin/staff/:id
export const updateStaff = async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
  if (!(await findStaff(String(req.params.id)))) return res.status(404).json({ error: 'Staff member not found' });

  const { name, permissions, active } = parsed.data;
  const { rows } = await pool.query(
    `UPDATE admin_users SET
       name = COALESCE($2, name),
       permissions = COALESCE($3, permissions),
       active = COALESCE($4, active),
       sessions_valid_after = CASE WHEN $4 = false THEN now() ELSE sessions_valid_after END,
       updated_at = now()
     WHERE id = $1 RETURNING ${COLS}`,
    [String(req.params.id), name ?? null, permissions ?? null, active ?? null]
  );
  res.json(rows[0]);
};

// POST /api/admin/staff/:id/reset-password — new temporary password, signs them out everywhere.
export const resetStaffPassword = async (req: Request, res: Response) => {
  if (!(await findStaff(String(req.params.id)))) return res.status(404).json({ error: 'Staff member not found' });
  const password = tempPassword();
  await pool.query(
    'UPDATE admin_users SET password_hash = $2, sessions_valid_after = now(), updated_at = now() WHERE id = $1',
    [String(req.params.id), hashPassword(password)]
  );
  await pool.query('DELETE FROM admin_otp WHERE admin_id = $1', [String(req.params.id)]);
  res.json({ temporaryPassword: password });
};

// DELETE /api/admin/staff/:id
export const deleteStaff = async (req: Request, res: Response) => {
  const { rowCount } = await pool.query("DELETE FROM admin_users WHERE id = $1 AND role = 'staff'", [String(req.params.id)]);
  if (!rowCount) return res.status(404).json({ error: 'Staff member not found' });
  res.json({ success: true });
};
