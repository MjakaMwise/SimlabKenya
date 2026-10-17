import pool from '../config/postgres.js';
import { AbstractSubmission, UploadedAbstractFile } from '../types/index.js';

const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

const SELECT = `
  SELECT a.id, a.school_name AS "schoolName", a.student_names AS "studentNames",
         a.teacher_name AS "teacherName", a.teacher_email AS "teacherEmail",
         a.teacher_contact AS "teacherContact", a.project_title AS "projectTitle",
         a.project_description AS "projectDescription", a.project_category AS "projectCategory",
         a.status, a.submitted_at AS "submittedAt",
         COALESCE((
           SELECT json_agg(json_build_object(
                    'id', f.id, 'originalName', f.original_name, 'mimeType', f.mime_type, 'size', f.size,
                    'url', '/api/abstracts/' || a.id || '/files/' || f.id)
                  ORDER BY f.created_at)
           FROM abstract_files f WHERE f.abstract_id = a.id
         ), '[]'::json) AS files
  FROM abstracts a`;

export const saveAbstract = async (
  s: AbstractSubmission,
  files: UploadedAbstractFile[]
): Promise<{ id: string; submittedAt: string; fileIds: string[] }> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO abstracts (school_name, student_names, teacher_name, teacher_email, teacher_contact,
                              project_title, project_description, project_category)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, submitted_at`,
      [s.schoolName, s.studentNames, s.teacherName, s.teacherEmail, s.teacherContact,
       s.projectTitle, s.projectDescription, s.projectCategory]
    );
    const fileIds: string[] = [];
    for (const f of files) {
      const r = await client.query(
        `INSERT INTO abstract_files (abstract_id, original_name, stored_name, mime_type, size)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [rows[0].id, f.originalName, f.storedName, f.mimeType, f.size]
      );
      fileIds.push(r.rows[0].id);
    }
    await client.query('COMMIT');
    return { id: rows[0].id, submittedAt: rows[0].submitted_at.toISOString(), fileIds };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const listAbstracts = async () => (await pool.query(`${SELECT} ORDER BY a.submitted_at DESC`)).rows;

export const getAbstract = async (id: string) =>
  isUuid(id) ? ((await pool.query(`${SELECT} WHERE a.id = $1`, [id])).rows[0] ?? null) : null;

export const updateAbstractStatus = async (id: string, status: string): Promise<boolean> => {
  if (!isUuid(id)) return false;
  const { rowCount } = await pool.query('UPDATE abstracts SET status = $2, updated_at = now() WHERE id = $1', [id, status]);
  return !!rowCount;
};

export const countAbstractsByStatus = async (): Promise<{ total: number; pending: number }> => {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'pending')::int AS pending FROM abstracts`
  );
  return rows[0];
};

export const getAbstractFile = async (abstractId: string, fileId: string) => {
  if (!isUuid(abstractId) || !isUuid(fileId)) return null;
  const { rows } = await pool.query(
    `SELECT original_name AS "originalName", stored_name AS "storedName", mime_type AS "mimeType"
     FROM abstract_files WHERE id = $1 AND abstract_id = $2`,
    [fileId, abstractId]
  );
  return rows[0] ?? null;
};
