-- Per-product lesson list with manual sort order.
-- Used by course detail and watch pages, replacing the hardcoded checklist.
CREATE TABLE IF NOT EXISTS course_lessons (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  duration TEXT NOT NULL DEFAULT '0:00',
  video_url TEXT,
  is_preview INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_product_id
  ON course_lessons (product_id, sort_order);
