-- Lets an admin's sessions be invalidated (password reset, "sign out everywhere"). Idempotent.
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS sessions_valid_after TIMESTAMPTZ NOT NULL DEFAULT to_timestamp(0);
