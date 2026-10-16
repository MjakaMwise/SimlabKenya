-- Runs once, the first time the Postgres container initialises an empty data volume.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS ocean_shujaa_registrations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_name TEXT        NOT NULL CHECK (char_length(participant_name) BETWEEN 2 AND 120),
  participant_age  SMALLINT    CHECK (participant_age BETWEEN 3 AND 99),
  level            TEXT        NOT NULL CHECK (level IN
                     ('primary','junior_secondary','senior_secondary','college','group','other')),
  institution      TEXT        NOT NULL CHECK (char_length(institution) BETWEEN 2 AND 160),
  guardian_name    TEXT        NOT NULL CHECK (char_length(guardian_name) BETWEEN 2 AND 120),
  guardian_phone   TEXT        NOT NULL CHECK (char_length(guardian_phone) BETWEEN 7 AND 25),
  guardian_email   TEXT        NOT NULL CHECK (char_length(guardian_email) BETWEEN 5 AND 160),
  group_size       SMALLINT    NOT NULL DEFAULT 1 CHECK (group_size BETWEEN 1 AND 500),
  notes            TEXT        CHECK (char_length(notes) <= 2000),
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','waitlisted','cancelled')),
  admin_notes      TEXT        CHECK (char_length(admin_notes) <= 2000),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_os_reg_status  ON ocean_shujaa_registrations (status);
CREATE INDEX IF NOT EXISTS idx_os_reg_created ON ocean_shujaa_registrations (created_at DESC);

CREATE OR REPLACE FUNCTION os_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_os_reg_updated ON ocean_shujaa_registrations;
CREATE TRIGGER trg_os_reg_updated BEFORE UPDATE ON ocean_shujaa_registrations
  FOR EACH ROW EXECUTE FUNCTION os_touch_updated_at();
