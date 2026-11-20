CREATE TABLE teacher_attempts (
  user_id TEXT PRIMARY KEY,
  window INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE teacher_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE practicals (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  station TEXT NOT NULL,
  label TEXT NOT NULL,
  questions TEXT NOT NULL,
  recipe TEXT NOT NULL,
  created INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX practicals_by_teacher ON practicals(teacher_id, created);
--> statement-breakpoint
CREATE TABLE practical_students (
  id TEXT PRIMARY KEY,
  practical_id TEXT NOT NULL REFERENCES practicals(id),
  name TEXT NOT NULL,
  class_group TEXT NOT NULL,
  invite_hash TEXT NOT NULL UNIQUE,
  invite TEXT NOT NULL,
  user_id TEXT,
  report TEXT,
  submitted INTEGER
);
--> statement-breakpoint
CREATE INDEX students_by_practical ON practical_students(practical_id);
--> statement-breakpoint
CREATE INDEX students_by_account ON practical_students(user_id);
