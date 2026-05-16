CREATE TABLE IF NOT EXISTS course_questions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT NOT NULL,
  body TEXT NOT NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_course_questions_course
  ON course_questions (course_id, created_at DESC);
