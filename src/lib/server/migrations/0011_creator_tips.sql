CREATE TABLE IF NOT EXISTS creator_tips (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  tipper_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  checkout_session_id TEXT,
  payment_intent_id TEXT,
  payment_provider TEXT NOT NULL DEFAULT 'stripe',
  payment_ref TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (tipper_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_creator_tips_creator ON creator_tips (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_tips_tipper ON creator_tips (tipper_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_tips_checkout_session
  ON creator_tips (checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;
