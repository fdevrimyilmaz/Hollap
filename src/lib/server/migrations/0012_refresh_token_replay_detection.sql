-- Refresh token rotation with replay detection.
--
-- previous_refresh_token_hash holds the hash of the previously-rotated refresh
-- token within a short grace window. A request presenting this token after
-- rotation indicates either (a) a stale tab racing with a successful rotation,
-- or (b) a stolen token being replayed by an attacker. We treat any match
-- against this column as a security event: the whole session is revoked and an
-- audit row is written.
ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS previous_refresh_token_hash TEXT;

ALTER TABLE auth_sessions
  ADD COLUMN IF NOT EXISTS previous_refresh_token_expires_at TEXT;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_previous_refresh_token_hash
  ON auth_sessions (previous_refresh_token_hash)
  WHERE previous_refresh_token_hash IS NOT NULL;
