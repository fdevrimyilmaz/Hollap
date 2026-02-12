ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at TEXT;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  requested_ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_email_verification_user
  ON email_verification_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_expires
  ON email_verification_tokens (expires_at);

UPDATE users
SET email_verified_at = COALESCE(email_verified_at, updated_at)
WHERE id IN ('usr_creator_demo', 'usr_subscriber_demo');
