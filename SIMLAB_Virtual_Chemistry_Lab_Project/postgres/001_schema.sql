-- SIMLAB Virtual Chemistry Lab PostgreSQL schema.
-- This is an initial schema for a self-hosted PostgreSQL instance.
-- It does not migrate or modify an existing Cloudflare D1 database.

CREATE TABLE IF NOT EXISTS teacher_attempts (
  user_id TEXT PRIMARY KEY,
  window BIGINT NOT NULL,
  attempts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_passwords (
  user_id TEXT PRIMARY KEY,
  verifier TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_accounts (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  created BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS teacher_accounts_by_created ON teacher_accounts(created);

CREATE TABLE IF NOT EXISTS practicals (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  station TEXT NOT NULL,
  label TEXT NOT NULL,
  questions TEXT NOT NULL,
  recipe TEXT NOT NULL,
  created BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS practicals_by_teacher ON practicals(teacher_id, created);

CREATE TABLE IF NOT EXISTS practical_students (
  id TEXT PRIMARY KEY,
  practical_id TEXT NOT NULL REFERENCES practicals(id),
  name TEXT NOT NULL,
  class_group TEXT NOT NULL,
  invite_hash TEXT NOT NULL UNIQUE,
  invite TEXT NOT NULL,
  user_id TEXT,
  report TEXT,
  submitted BIGINT
);
CREATE INDEX IF NOT EXISTS students_by_practical ON practical_students(practical_id);
CREATE INDEX IF NOT EXISTS students_by_account ON practical_students(user_id);

CREATE TABLE IF NOT EXISTS teacher_question_sets (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  station TEXT NOT NULL,
  label TEXT NOT NULL,
  questions TEXT NOT NULL,
  recipe TEXT NOT NULL,
  created BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS question_sets_by_teacher ON teacher_question_sets(teacher_id, created);

CREATE TABLE IF NOT EXISTS practical_student_drafts (
  student_id TEXT PRIMARY KEY REFERENCES practical_students(id),
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  updated BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS practical_submissions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES practical_students(id),
  attempt INTEGER NOT NULL,
  report TEXT NOT NULL,
  submitted BIGINT NOT NULL,
  UNIQUE(student_id, attempt)
);
CREATE INDEX IF NOT EXISTS submissions_by_student ON practical_submissions(student_id, attempt);

CREATE TABLE IF NOT EXISTS teacher_roster_folders (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  label TEXT NOT NULL,
  created BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS roster_folders_by_teacher_label
  ON teacher_roster_folders(teacher_id, lower(label));

CREATE TABLE IF NOT EXISTS teacher_roster_students (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  folder_id TEXT NOT NULL REFERENCES teacher_roster_folders(id),
  name TEXT NOT NULL,
  class_group TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS roster_students_by_teacher_folder_name
  ON teacher_roster_students(teacher_id, folder_id, lower(name));
CREATE INDEX IF NOT EXISTS roster_students_by_teacher_folder
  ON teacher_roster_students(teacher_id, folder_id, name);

CREATE TABLE IF NOT EXISTS teacher_aas_assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  folder_id TEXT,
  student_id TEXT,
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL DEFAULT '',
  student_group TEXT NOT NULL DEFAULT '',
  folder_label TEXT NOT NULL DEFAULT '',
  assignment_title TEXT NOT NULL,
  element TEXT NOT NULL,
  sample_label TEXT NOT NULL,
  concentration DOUBLE PRECISION NOT NULL,
  signal DOUBLE PRECISION NOT NULL,
  code TEXT NOT NULL,
  created BIGINT NOT NULL,
  claimed_user_id TEXT,
  claimed_at BIGINT
);
CREATE INDEX IF NOT EXISTS aas_assignments_by_teacher_created
  ON teacher_aas_assignments(teacher_id, created DESC);
