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
];

export const migrate = async (): Promise<void> => {
  for (const sql of STATEMENTS) await pool.query(sql);
};
