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
  // Team Desk: staff chat, tasks and push subscriptions. Channels are fixed in code (services/chat.ts).
  `CREATE TABLE IF NOT EXISTS chat_messages (
     id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     channel    TEXT NOT NULL,
     author_id  UUID REFERENCES admin_users(id) ON DELETE SET NULL,
     body       TEXT NOT NULL,
     mentions   UUID[] NOT NULL DEFAULT '{}',
     ref_type   TEXT,
     ref_id     TEXT,
     ref_label  TEXT,
     is_event   BOOLEAN NOT NULL DEFAULT false,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS chat_messages_channel_idx ON chat_messages (channel, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS chat_reads (
     user_id      UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
     channel      TEXT NOT NULL,
     last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (user_id, channel)
   )`,
  `CREATE TABLE IF NOT EXISTS chat_tasks (
     id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     channel      TEXT NOT NULL,
     message_id   UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
     title        TEXT NOT NULL,
     assignee_id  UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
     created_by   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
     due_date     DATE,
     status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
     created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
     completed_at TIMESTAMPTZ
   )`,
  `CREATE INDEX IF NOT EXISTS chat_tasks_assignee_idx ON chat_tasks (assignee_id, status)`,
  `CREATE INDEX IF NOT EXISTS chat_tasks_channel_idx ON chat_tasks (channel, status)`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
     id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id    UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
     endpoint   TEXT NOT NULL UNIQUE,
     p256dh     TEXT NOT NULL,
     auth       TEXT NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id)`,
  // Individual / group / school registrations. Schools sign in to a portal and manage their own students.
  `ALTER TABLE ocean_shujaa_registrations
     ADD COLUMN IF NOT EXISTS registration_type TEXT NOT NULL DEFAULT 'individual'`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'os_reg_type_check') THEN
       ALTER TABLE ocean_shujaa_registrations
         ADD CONSTRAINT os_reg_type_check CHECK (registration_type IN ('individual', 'group'));
     END IF;
   END $$`,
  `CREATE TABLE IF NOT EXISTS schools (
     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name            TEXT NOT NULL,
     school_type     TEXT NOT NULL,
     county          TEXT NOT NULL,
     admin_name      TEXT NOT NULL,
     admin_email     TEXT NOT NULL,
     admin_phone     TEXT NOT NULL,
     password_hash   TEXT NOT NULL,
     status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','waitlisted','cancelled')),
     admin_notes     TEXT,
     sessions_valid_after TIMESTAMPTZ NOT NULL DEFAULT to_timestamp(0),
     created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS schools_admin_email_idx ON schools (lower(admin_email))`,
  `CREATE TABLE IF NOT EXISTS school_students (
     id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
     name           TEXT NOT NULL,
     age            SMALLINT CHECK (age BETWEEN 3 AND 99),
     grade          TEXT,
     level          TEXT NOT NULL,
     guardian_name  TEXT,
     guardian_phone TEXT,
     guardian_email TEXT,
     notes          TEXT,
     created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS school_students_school_idx ON school_students (school_id, created_at DESC)`,
];

export const migrate = async (): Promise<void> => {
  for (const sql of STATEMENTS) await pool.query(sql);
};
