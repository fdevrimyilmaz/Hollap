-- Per-product user reviews (rating + optional comment).
-- Unique constraint: a user can leave only one review per product (PATCH updates it).
CREATE TABLE IF NOT EXISTS course_reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_reviews_product
  ON course_reviews (product_id, created_at DESC);
