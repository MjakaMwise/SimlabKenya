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
  // Bulk and single email sent from the admin. Body is kept so failed sends can be retried.
  `CREATE TABLE IF NOT EXISTS email_log (
     id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     batch_id   UUID NOT NULL,
     sent_by    UUID REFERENCES admin_users(id) ON DELETE SET NULL,
     to_email   TEXT NOT NULL,
     to_name    TEXT,
     subject    TEXT NOT NULL,
     body       TEXT NOT NULL,
     status     TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
     error      TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     sent_at    TIMESTAMPTZ
   )`,
  `CREATE INDEX IF NOT EXISTS email_log_created_idx ON email_log (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS email_log_batch_idx ON email_log (batch_id)`,
  // WhatsApp inbox. phone holds digits only, country code first (254712345678).
  `CREATE TABLE IF NOT EXISTS wa_conversations (
     id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     phone                TEXT NOT NULL UNIQUE,
     name                 TEXT,
     status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
     assigned_to          UUID REFERENCES admin_users(id) ON DELETE SET NULL,
     bot_state            TEXT NOT NULL DEFAULT 'main',
     bot_active           BOOLEAN NOT NULL DEFAULT true,
     needs_human          BOOLEAN NOT NULL DEFAULT false,
     unread               INTEGER NOT NULL DEFAULT 0,
     last_message_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
     last_message_preview TEXT,
     created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS wa_conversations_last_idx ON wa_conversations (last_message_at DESC)`,
  `CREATE TABLE IF NOT EXISTS wa_messages (
     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     conversation_id UUID NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,
     direction       TEXT NOT NULL CHECK (direction IN ('in','out')),
     sender          TEXT NOT NULL CHECK (sender IN ('client','bot','staff')),
     staff_id        UUID REFERENCES admin_users(id) ON DELETE SET NULL,
     body            TEXT NOT NULL,
     wa_id           TEXT UNIQUE,
     status          TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sending','sent','failed')),
     error           TEXT,
     created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS wa_messages_conv_idx ON wa_messages (conversation_id, created_at)`,
  // Menu-driven bot: one row per screen. options is [{ "key": "1", "goto": "shop" }, ...].
  `CREATE TABLE IF NOT EXISTS bot_nodes (
     id      TEXT PRIMARY KEY,
     text    TEXT NOT NULL,
     options JSONB NOT NULL DEFAULT '[]'::jsonb,
     input   TEXT CHECK (input IN ('order','registration')),
     action  TEXT CHECK (action IN ('human')),
     sort    INTEGER NOT NULL DEFAULT 0
   )`,
  `INSERT INTO bot_nodes (id, text, options, input, action, sort) VALUES
     ('main', E'Welcome to SIM-Lab Kenya.\nReply with a number:\n\n1. Shop & products\n2. Track my order\n3. Ocean Shujaa\n4. Science fair abstracts\n5. Talk to a person',
        '[{"key":"1","goto":"shop"},{"key":"2","goto":"order_ask"},{"key":"3","goto":"ocean"},{"key":"4","goto":"abstracts"},{"key":"5","goto":"human"}]', NULL, NULL, 0),
     ('shop', E'Shop\n\n1. View products\n2. How to pay\n3. Delivery info\n0. Main menu',
        '[{"key":"1","goto":"shop_products"},{"key":"2","goto":"shop_pay"},{"key":"3","goto":"shop_delivery"},{"key":"0","goto":"main"}]', NULL, NULL, 1),
     ('shop_products', E'Browse our kits at https://simlabkenya.co.ke/shop\n\n0. Main menu', '[{"key":"0","goto":"main"}]', NULL, NULL, 2),
     ('shop_pay', E'Pay on collection (cash or M-Pesa) for pickup, on delivery in Mombasa, or by M-Pesa or bank transfer before shipping elsewhere.\n\n0. Main menu', '[{"key":"0","goto":"main"}]', NULL, NULL, 3),
     ('shop_delivery', E'Pickup is at the IOME001 Innovation Hub. Delivery fees are confirmed when we contact you about your order.\n\n0. Main menu', '[{"key":"0","goto":"main"}]', NULL, NULL, 4),
     ('order_ask', E'Please send your order number.', '[{"key":"0","goto":"main"}]', 'order', NULL, 5),
     ('ocean', E'Ocean Shujaa\n\n1. Check my registration\n2. About the program\n0. Main menu',
        '[{"key":"1","goto":"ocean_ask"},{"key":"2","goto":"ocean_info"},{"key":"0","goto":"main"}]', NULL, NULL, 6),
     ('ocean_ask', E'Please send the phone number or email you registered with.', '[{"key":"0","goto":"main"}]', 'registration', NULL, 7),
     ('ocean_info', E'Ocean Shujaa is our holiday program for learners from primary to senior secondary. Dates and registration are on https://simlabkenya.co.ke/oceanshujaa\n\n0. Main menu', '[{"key":"0","goto":"main"}]', NULL, NULL, 8),
     ('abstracts', E'Science fair abstracts are submitted online at https://simlabkenya.co.ke and reviewed by our team. You will get an email when the status changes.\n\n0. Main menu', '[{"key":"0","goto":"main"}]', NULL, NULL, 9),
     ('human', E'Connecting you to our team. We will reply here shortly.', '[]', NULL, 'human', 10)
   ON CONFLICT (id) DO NOTHING`,
  `INSERT INTO site_settings (key, value) VALUES ('wa_bot_enabled', 'true'::jsonb) ON CONFLICT (key) DO NOTHING`,
  `INSERT INTO site_settings (key, value) VALUES ('wa_bot_hours', '{"enabled":false,"start":"08:00","end":"17:00","days":[1,2,3,4,5]}'::jsonb) ON CONFLICT (key) DO NOTHING`,
];

// Team chat became a delegated area: staff who could use it before keep it, once. Later removals stick.
const GRANT_CHAT = [
  `CREATE TABLE IF NOT EXISTS app_flags (name TEXT PRIMARY KEY, set_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
  `WITH first_run AS (INSERT INTO app_flags (name) VALUES ('chat_permission_granted') ON CONFLICT DO NOTHING RETURNING 1)
   UPDATE admin_users SET permissions = array_append(permissions, 'chat:manage')
   WHERE role <> 'admin' AND EXISTS (SELECT 1 FROM first_run) AND NOT ('chat:manage' = ANY(permissions))`,
];

export const migrate = async (): Promise<void> => {
  for (const sql of [...STATEMENTS, ...GRANT_CHAT]) await pool.query(sql);
};
