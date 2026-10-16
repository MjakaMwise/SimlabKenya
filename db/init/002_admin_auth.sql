-- Admin accounts and email one-time codes. Idempotent: safe to re-run.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_otp (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID        NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  code_hash  TEXT        NOT NULL,
  attempts   SMALLINT    NOT NULL DEFAULT 0,
  used       BOOLEAN     NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_otp_admin ON admin_otp (admin_id, created_at DESC);
