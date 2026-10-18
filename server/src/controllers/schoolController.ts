import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/postgres.js';
import { postEvent } from '../services/chat.js';
import { hashPassword, verifyPassword, signToken } from '../services/authService.js';
import { sendSchoolRegistrationEmail, sendSchoolStatusEmail } from '../services/emailService.js';
import { ADMIN_DASHBOARD_URL } from '../config/email.js';

const LEVELS = ['primary', 'junior_secondary', 'senior_secondary', 'college', 'other'] as const;
const STATUSES = ['pending', 'confirmed', 'waitlisted', 'cancelled'] as const;
const SCHOOL_TYPES = ['primary', 'junior_secondary', 'senior_secondary', 'mixed', 'college', 'other'] as const;
const MAX_STUDENTS = 500;
const MAX_BULK = 200;

const phone = z.string().trim().min(7).max(25).regex(/^[0-9+\-()\s]+$/, 'Invalid phone number');
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);
const optionalEmail = z.string().trim().email().max(160).or(z.literal('')).optional().nullable().transform((v) => v || null);
const optionalPhone = phone.or(z.literal('')).optional().nullable().transform((v) => v || null);

const registerSchema = z.object({
  schoolName: z.string().trim().min(2).max(160),
  schoolType: z.enum(SCHOOL_TYPES),
  county: z.string().trim().min(2).max(80),
  adminName: z.string().trim().min(2).max(120),
  adminEmail: z.string().trim().toLowerCase().email().max(160),
  adminPhone: phone,
  password: z.string().min(8).max(128),
  website: z.string().max(0).optional(), // honeypot
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(1).max(128),
});

const studentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  age: z.coerce.number().int().min(3).max(99).optional().nullable().or(z.literal('').transform(() => null)),
  grade: optionalText(40),
  level: z.enum(LEVELS),
  guardianName: optionalText(120),
  guardianPhone: optionalPhone,
  guardianEmail: optionalEmail,
  notes: optionalText(1000),
});

const bulkSchema = z.object({ students: z.array(studentSchema).min(1).max(MAX_BULK) });

const adminUpdateSchema = z
  .object({ status: z.enum(STATUSES).optional(), adminNotes: z.string().trim().max(2000).nullable().optional() })
  .refine((v) => v.status !== undefined || v.adminNotes !== undefined, 'Nothing to update');

const passwordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) });

const SCHOOL_COLUMNS = `id, name, school_type AS "schoolType", county, admin_name AS "adminName",
  admin_email AS "adminEmail", admin_phone AS "adminPhone", status, admin_notes AS "adminNotes",
  created_at AS "createdAt"`;

const STUDENT_COLUMNS = `id, name, age, grade, level, guardian_name AS "guardianName",
  guardian_phone AS "guardianPhone", guardian_email AS "guardianEmail", notes, created_at AS "createdAt"`;

const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
const portalUrl = () => ADMIN_DASHBOARD_URL.replace(/\/admin\/?$/, '') + '/school/portal';

// Used to keep login timing the same whether or not the email exists.
const DUMMY_HASH = hashPassword('not-a-real-password');

const publicSchool = (r: Record<string, unknown>) => ({
  id: r.id, name: r.name, schoolType: r.schoolType, county: r.county, adminName: r.adminName,
  adminEmail: r.adminEmail, adminPhone: r.adminPhone, status: r.status,
});

// ── Public ────────────────────────────────────────────────────────────────────

// POST /api/schools/register
export const registerSchool = async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    if (req.body?.website) return res.status(201).json({ success: true });
    const details = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return res.status(400).json({ error: 'Validation failed', details });
  }
  const d = parsed.data;
  const exists = await pool.query('SELECT 1 FROM schools WHERE lower(admin_email) = $1', [d.adminEmail]);
  if (exists.rowCount) {
    return res.status(409).json({ error: 'A school is already registered with this email. Please sign in instead.' });
  }
  const { rows } = await pool.query(
    `INSERT INTO schools (name, school_type, county, admin_name, admin_email, admin_phone, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${SCHOOL_COLUMNS}`,
    [d.schoolName, d.schoolType, d.county, d.adminName, d.adminEmail, d.adminPhone, hashPassword(d.password)]
  );
  const school = rows[0];
  postEvent('ocean-shujaa', `New school registered: ${school.name} (${school.county})`,
    { type: 'registration', id: school.id, label: school.name });
  sendSchoolRegistrationEmail(
    { name: school.name, adminName: school.adminName, adminEmail: school.adminEmail, adminPhone: school.adminPhone, county: school.county },
    portalUrl()
  ).catch((err) => console.error('School registration email failed:', err));
  res.status(201).json({ token: signToken({ id: school.id, email: school.adminEmail }, 'school'), school: publicSchool(school) });
};

// POST /api/schools/login
export const loginSchool = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter your email and password' });
  const { rows } = await pool.query(
    `SELECT ${SCHOOL_COLUMNS}, password_hash FROM schools WHERE lower(admin_email) = $1`,
    [parsed.data.email]
  );
  const school = rows[0];
  const ok = verifyPassword(parsed.data.password, school?.password_hash ?? DUMMY_HASH);
  if (!school || !ok || school.status === 'cancelled') return res.status(401).json({ error: 'Incorrect email or password' });
  res.json({ token: signToken({ id: school.id, email: school.adminEmail }, 'school'), school: publicSchool(school) });
};

// ── School portal ─────────────────────────────────────────────────────────────

// GET /api/schools/me
export const getMe = async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT ${SCHOOL_COLUMNS}, (SELECT COUNT(*)::int FROM school_students WHERE school_id = schools.id) AS "studentCount"
     FROM schools WHERE id = $1`,
    [req.school!.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'School not found' });
  const { studentCount, ...school } = rows[0];
  res.json({ school: publicSchool(school), studentCount });
};

// GET /api/schools/students
export const listStudents = async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT ${STUDENT_COLUMNS} FROM school_students WHERE school_id = $1 ORDER BY created_at DESC`,
    [req.school!.id]
  );
  res.json({ students: rows });
};

const insertStudents = async (schoolId: string, list: z.infer<typeof studentSchema>[]) => {
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*)::int AS count FROM school_students WHERE school_id = $1', [schoolId]);
  if (count + list.length > MAX_STUDENTS) {
    return { error: `A school can have at most ${MAX_STUDENTS} students (you have ${count}).` };
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const s of list) {
      const { rows } = await client.query(
        `INSERT INTO school_students (school_id, name, age, grade, level, guardian_name, guardian_phone, guardian_email, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${STUDENT_COLUMNS}`,
        [schoolId, s.name, s.age ?? null, s.grade, s.level, s.guardianName, s.guardianPhone, s.guardianEmail, s.notes]
      );
      created.push(rows[0]);
    }
    await client.query('COMMIT');
    return { created };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// POST /api/schools/students
export const addStudent = async (req: Request, res: Response) => {
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') });
  }
  const result = await insertStudents(req.school!.id, [parsed.data]);
  if ('error' in result) return res.status(409).json({ error: result.error });
  res.status(201).json({ student: result.created![0] });
};

// POST /api/schools/students/bulk
export const addStudentsBulk = async (req: Request, res: Response) => {
  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    const row = typeof first.path[1] === 'number' ? `Row ${first.path[1] + 1}: ` : '';
    return res.status(400).json({ error: `${row}${first.path.slice(2).join('.') || first.path.join('.')} ${first.message}`.trim() });
  }
  const result = await insertStudents(req.school!.id, parsed.data.students);
  if ('error' in result) return res.status(409).json({ error: result.error });
  res.status(201).json({ students: result.created });
};

// PATCH /api/schools/students/:id
export const updateStudent = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid id' });
  const parsed = studentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed' });
  const s = parsed.data;
  const { rows } = await pool.query(
    `UPDATE school_students SET name=$1, age=$2, grade=$3, level=$4, guardian_name=$5, guardian_phone=$6,
       guardian_email=$7, notes=$8, updated_at=now()
     WHERE id=$9 AND school_id=$10 RETURNING ${STUDENT_COLUMNS}`,
    [s.name, s.age ?? null, s.grade, s.level, s.guardianName, s.guardianPhone, s.guardianEmail, s.notes, id, req.school!.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Student not found' });
  res.json({ student: rows[0] });
};

// DELETE /api/schools/students/:id
export const deleteStudent = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid id' });
  const { rowCount } = await pool.query('DELETE FROM school_students WHERE id = $1 AND school_id = $2', [id, req.school!.id]);
  if (!rowCount) return res.status(404).json({ error: 'Student not found' });
  res.json({ success: true });
};

// POST /api/schools/change-password
export const changeSchoolPassword = async (req: Request, res: Response) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  const { rows } = await pool.query('SELECT password_hash FROM schools WHERE id = $1', [req.school!.id]);
  if (!rows.length || !verifyPassword(parsed.data.currentPassword, rows[0].password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  await pool.query(
    'UPDATE schools SET password_hash = $1, sessions_valid_after = now(), updated_at = now() WHERE id = $2',
    [hashPassword(parsed.data.newPassword), req.school!.id]
  );
  // Every session, including this one, is now revoked: the portal sends the school back to sign in.
  res.json({ success: true });
};

// ── Admin ─────────────────────────────────────────────────────────────────────

// GET /api/schools/admin/list
export const adminListSchools = async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT ${SCHOOL_COLUMNS}, (SELECT COUNT(*)::int FROM school_students WHERE school_id = schools.id) AS "studentCount"
     FROM schools ORDER BY created_at DESC LIMIT 1000`
  );
  res.json({ schools: rows });
};

// GET /api/schools/admin/:id/students
export const adminListStudents = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid id' });
  const { rows } = await pool.query(
    `SELECT ${STUDENT_COLUMNS} FROM school_students WHERE school_id = $1 ORDER BY name`, [id]
  );
  res.json({ students: rows });
};

// PATCH /api/schools/admin/:id
export const adminUpdateSchool = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid id' });
  const parsed = adminUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed' });
  const sets: string[] = [];
  const params: unknown[] = [];
  if (parsed.data.status !== undefined) { params.push(parsed.data.status); sets.push(`status = $${params.length}`); }
  if (parsed.data.adminNotes !== undefined) { params.push(parsed.data.adminNotes || null); sets.push(`admin_notes = $${params.length}`); }
  params.push(id);
  const previous = parsed.data.status !== undefined
    ? (await pool.query('SELECT status FROM schools WHERE id = $1', [id])).rows[0]?.status
    : undefined;
  const { rows } = await pool.query(
    `UPDATE schools SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING ${SCHOOL_COLUMNS}`, params
  );
  if (!rows.length) return res.status(404).json({ error: 'School not found' });
  const s = rows[0];
  if (parsed.data.status !== undefined && previous !== s.status) {
    sendSchoolStatusEmail({ name: s.name, adminName: s.adminName, adminEmail: s.adminEmail, adminPhone: s.adminPhone, county: s.county, status: s.status })
      .catch((err) => console.error('School status email failed:', err));
  }
  res.json({ school: s });
};

// DELETE /api/schools/admin/:id
export const adminDeleteSchool = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(400).json({ error: 'Invalid id' });
  const { rowCount } = await pool.query('DELETE FROM schools WHERE id = $1', [id]);
  if (!rowCount) return res.status(404).json({ error: 'School not found' });
  res.json({ success: true });
};

// GET /api/schools/admin/export.csv — every student, with their school
export const adminExportCsv = async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT sc.name AS "school", sc.county, sc.status AS "schoolStatus", sc.admin_name AS "schoolAdmin",
            sc.admin_email AS "schoolEmail", sc.admin_phone AS "schoolPhone",
            st.name AS "student", st.age, st.grade, st.level, st.guardian_name AS "guardianName",
            st.guardian_phone AS "guardianPhone", st.guardian_email AS "guardianEmail", st.notes
     FROM schools sc LEFT JOIN school_students st ON st.school_id = sc.id
     ORDER BY sc.name, st.name`
  );
  const headers = ['school', 'county', 'schoolStatus', 'schoolAdmin', 'schoolEmail', 'schoolPhone',
    'student', 'age', 'grade', 'level', 'guardianName', 'guardianPhone', 'guardianEmail', 'notes'];
  const cell = (v: unknown) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => cell(r[h])).join(','))].join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ocean-shujaa-schools.csv"');
  res.send(csv);
};
