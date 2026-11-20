CREATE TABLE teacher_accounts (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL
);
CREATE INDEX teacher_accounts_by_created ON teacher_accounts(created);
