CREATE TABLE teacher_question_sets (
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
CREATE INDEX question_sets_by_teacher ON teacher_question_sets(teacher_id, created);
--> statement-breakpoint
CREATE TABLE practical_student_drafts (
  student_id TEXT PRIMARY KEY REFERENCES practical_students(id),
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  updated INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE practical_submissions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES practical_students(id),
  attempt INTEGER NOT NULL,
  report TEXT NOT NULL,
  submitted INTEGER NOT NULL,
  UNIQUE(student_id, attempt)
);
--> statement-breakpoint
CREATE INDEX submissions_by_student ON practical_submissions(student_id, attempt);
