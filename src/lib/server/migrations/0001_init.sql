CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('creator', 'subscriber')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  replaced_by_session_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (replaced_by_session_id) REFERENCES auth_sessions(id)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
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

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  window_started_at BIGINT NOT NULL,
  blocked_until BIGINT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_json TEXT,
  status_code INTEGER,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  UNIQUE (scope, idempotency_key)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  stock INTEGER NOT NULL,
  sold INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS dm_conversations (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  subscriber_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (subscriber_id) REFERENCES users(id),
  UNIQUE (creator_id, subscriber_id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  moderated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES dm_conversations(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS dm_orders (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  creator_id TEXT NOT NULL,
  subscriber_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'payment_link_sent', 'paid', 'completed', 'failed', 'refunded')),
  amount_cents INTEGER NOT NULL,
  checkout_session_id TEXT,
  payment_intent_id TEXT,
  payment_link_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES dm_conversations(id),
  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (subscriber_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  order_id TEXT,
  amount_cents INTEGER NOT NULL,
  source TEXT NOT NULL,
  payment_provider TEXT NOT NULL,
  payment_ref TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (order_id) REFERENCES dm_orders(id)
);

CREATE TABLE IF NOT EXISTS live_sessions (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  schedule TEXT NOT NULL,
  booked INTEGER NOT NULL,
  total INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'live', 'ended')),
  stream_key TEXT,
  playback_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS live_chat_messages (
  id TEXT PRIMARY KEY,
  live_session_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  flagged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (live_session_id) REFERENCES live_sessions(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push')),
  destination TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  provider_message_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (notification_id) REFERENCES notifications(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, endpoint),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  subscriber_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE (creator_id, subscriber_id),
  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (subscriber_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS file_assets (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  audience TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS file_grants (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  granted_via TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (asset_id, user_id),
  FOREIGN KEY (asset_id) REFERENCES file_assets(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS file_dispatches (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  audience TEXT NOT NULL,
  files_count INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS file_download_tokens (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES file_assets(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('received', 'processed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  processed_at TEXT,
  UNIQUE (provider, event_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_dm_orders_creator ON dm_orders (creator_id);
CREATE INDEX IF NOT EXISTS idx_dm_orders_subscriber ON dm_orders (subscriber_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON notification_deliveries (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON webhook_events (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_sales_creator ON sales (creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys (expires_at);