ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_status TEXT;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS current_period_end TEXT;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS canceled_at TEXT;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS updated_at TEXT;

UPDATE subscriptions
SET stripe_status = CASE
  WHEN active = 1 THEN 'active'
  ELSE 'canceled'
END
WHERE stripe_status IS NULL OR BTRIM(stripe_status) = '';

UPDATE subscriptions
SET active = CASE
  WHEN LOWER(stripe_status) IN ('active', 'trialing') THEN 1
  ELSE 0
END
WHERE stripe_status IS NOT NULL;

UPDATE subscriptions
SET updated_at = created_at
WHERE updated_at IS NULL OR BTRIM(updated_at) = '';

CREATE INDEX IF NOT EXISTS idx_subscriptions_creator_status
  ON subscriptions (creator_id, stripe_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id
  ON subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
