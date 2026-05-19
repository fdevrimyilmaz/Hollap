-- Stripe Connect onboarding state per creator.
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_payouts_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_country TEXT;

CREATE INDEX IF NOT EXISTS idx_users_stripe_account
  ON users (stripe_account_id);
