import pool from '../config/postgres.js';

// Idempotent schema updates that run on every API start, so existing databases (where db/init/*.sql
// has already run once and never runs again) pick up new columns without a manual step.
const STATEMENTS = [
  `ALTER TABLE admin_users
     ADD COLUMN IF NOT EXISTS name        TEXT,
     ADD COLUMN IF NOT EXISTS role        TEXT    NOT NULL DEFAULT 'admin',
     ADD COLUMN IF NOT EXISTS permissions TEXT[]  NOT NULL DEFAULT '{}',
     ADD COLUMN IF NOT EXISTS active      BOOLEAN NOT NULL DEFAULT true`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_role_check') THEN
       ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'staff'));
     END IF;
   END $$`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] NOT NULL DEFAULT '{}'`,
  `CREATE TABLE IF NOT EXISTS site_settings (
     key   TEXT PRIMARY KEY,
     value JSONB NOT NULL
   )`,
  // The shop starts switched off; an admin turns it on from Admin > Products.
  `INSERT INTO site_settings (key, value) VALUES ('shop_enabled', 'false'::jsonb) ON CONFLICT (key) DO NOTHING`,
  // Abstract submissions and their files (previously in Firestore and Cloudinary).
  `CREATE TABLE IF NOT EXISTS abstracts (
     id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     school_name         TEXT NOT NULL,
     student_names       TEXT[] NOT NULL,
     teacher_name        TEXT NOT NULL,
     teacher_email       TEXT NOT NULL,
     teacher_contact     TEXT NOT NULL,
     project_title       TEXT NOT NULL,
     project_description TEXT NOT NULL,
     project_category    TEXT NOT NULL,
     status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','accepted','rejected')),
     submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at          TIMESTAMPTZ
   )`,
  `CREATE TABLE IF NOT EXISTS abstract_files (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     abstract_id   UUID NOT NULL REFERENCES abstracts(id) ON DELETE CASCADE,
     original_name TEXT NOT NULL,
     stored_name   TEXT NOT NULL,
     mime_type     TEXT NOT NULL,
     size          INTEGER NOT NULL,
     created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS abstract_files_abstract_idx ON abstract_files (abstract_id)`,
];

export const migrate = async (): Promise<void> => {
  for (const sql of STATEMENTS) await pool.query(sql);
};
