INSERT INTO users (id, name, email, password_hash, role, email_verified_at, created_at, updated_at)
VALUES
  (
    'usr_creator_demo',
    'Ayse Yilmaz',
    'creator@hollap.dev',
    '$2b$10$q3b1IeroO9szk9hwAcTPS.iJyZlk25c5.xM7.TAVleEjTtqwuFbQu',
    'creator',
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z'
  ),
  (
    'usr_subscriber_demo',
    'Ahmet Yildiz',
    'student@hollap.dev',
    '$2b$10$SVFNkXinhQatXDCU5rLRMuZv7tVNmBrxltyur8cPJnKb39rrEWClK',
    'subscriber',
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, creator_id, name, price_cents, stock, sold, is_active, created_at, updated_at)
VALUES
  (
    'prd-1',
    'usr_creator_demo',
    'Design Template Pack',
    2999,
    120,
    34,
    1,
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z'
  ),
  (
    'prd-2',
    'usr_creator_demo',
    '1:1 Mentorluk Seansi',
    7900,
    20,
    8,
    1,
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z'
  ),
  (
    'prd-3',
    'usr_creator_demo',
    'Notion Content Planner',
    1450,
    60,
    18,
    0,
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscriptions (
  id,
  creator_id,
  subscriber_id,
  tier,
  active,
  stripe_subscription_id,
  stripe_customer_id,
  stripe_status,
  current_period_end,
  canceled_at,
  created_at,
  updated_at
)
VALUES (
  'sub-seed-1',
  'usr_creator_demo',
  'usr_subscriber_demo',
  'vip',
  1,
  NULL,
  NULL,
  'active',
  NULL,
  NULL,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
)
ON CONFLICT (creator_id, subscriber_id) DO NOTHING;

INSERT INTO dm_conversations (id, creator_id, subscriber_id, created_at, updated_at)
VALUES (
  'dm-conv-1',
  'usr_creator_demo',
  'usr_subscriber_demo',
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
)
ON CONFLICT DO NOTHING;

INSERT INTO dm_messages (id, conversation_id, sender_id, body, moderated, created_at)
VALUES (
  'dmsg-seed-1',
  'dm-conv-1',
  'usr_subscriber_demo',
  'Merhaba, mentorluk seansi satin almak istiyorum.',
  0,
  '2026-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO dm_orders (
  id,
  conversation_id,
  creator_id,
  subscriber_id,
  product_id,
  status,
  amount_cents,
  checkout_session_id,
  payment_intent_id,
  payment_link_url,
  created_at,
  updated_at
)
VALUES (
  'dm-1',
  'dm-conv-1',
  'usr_creator_demo',
  'usr_subscriber_demo',
  'prd-2',
  'pending',
  7900,
  NULL,
  NULL,
  NULL,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO live_sessions (
  id,
  creator_id,
  title,
  schedule,
  booked,
  total,
  status,
  stream_key,
  playback_url,
  created_at,
  updated_at
)
VALUES
  (
    'live-1',
    'usr_creator_demo',
    'Haftalik fan yayini',
    'Cum 20:00',
    124,
    180,
    'scheduled',
    NULL,
    NULL,
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z'
  ),
  (
    'live-2',
    'usr_creator_demo',
    'Q&A + code review',
    'Paz 18:00',
    68,
    80,
    'scheduled',
    NULL,
    NULL,
    '2026-01-01T00:00:00.000Z',
    '2026-01-01T00:00:00.000Z'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO sales (
  id,
  creator_id,
  buyer_id,
  product_id,
  order_id,
  amount_cents,
  source,
  payment_provider,
  payment_ref,
  created_at
)
VALUES (
  'sale-seed-1',
  'usr_creator_demo',
  'usr_subscriber_demo',
  'prd-1',
  NULL,
  2999,
  'seed',
  'seed',
  NULL,
  '2026-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, user_id, type, title, message, link, read, created_at)
VALUES (
  'noti-seed-1',
  'usr_creator_demo',
  'sale',
  'Yeni satis',
  'Ahmet Yildiz Design Template Pack satin aldi',
  '/dashboard',
  0,
  '2026-01-01T00:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;
