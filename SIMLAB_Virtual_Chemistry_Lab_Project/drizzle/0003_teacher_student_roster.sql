CREATE TABLE IF NOT EXISTS teacher_roster_folders (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  label TEXT NOT NULL COLLATE NOCASE,
  created INTEGER NOT NULL,
  UNIQUE(teacher_id, label)
);

CREATE TABLE IF NOT EXISTS teacher_roster_students (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  folder_id TEXT NOT NULL REFERENCES teacher_roster_folders(id),
  name TEXT NOT NULL COLLATE NOCASE,
  class_group TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  UNIQUE(teacher_id, folder_id, name)
);

CREATE INDEX IF NOT EXISTS roster_students_by_teacher_folder
  ON teacher_roster_students(teacher_id, folder_id, name);
