-- Remove legacy demo seed records from production-like environments.
WITH demo_sessions AS (
  SELECT id
  FROM auth_sessions
  WHERE user_id IN ('usr_creator_demo', 'usr_subscriber_demo')
)
UPDATE auth_sessions
SET replaced_by_session_id = NULL
WHERE replaced_by_session_id IN (SELECT id FROM demo_sessions);

DELETE FROM email_verification_tokens
WHERE user_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM password_reset_tokens
WHERE user_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM auth_sessions
WHERE user_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM course_progress
WHERE user_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM course_questions
WHERE user_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM push_subscriptions
WHERE user_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM file_download_tokens
WHERE user_id IN ('usr_creator_demo', 'usr_subscriber_demo')
   OR asset_id IN (
    SELECT id
    FROM file_assets
    WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo')
  );

DELETE FROM file_grants
WHERE user_id IN ('usr_creator_demo', 'usr_subscriber_demo')
   OR asset_id IN (
    SELECT id
    FROM file_assets
    WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo')
  );

DELETE FROM file_assets
WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM file_dispatches
WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM notification_deliveries
WHERE user_id IN ('usr_creator_demo', 'usr_subscriber_demo')
   OR notification_id IN (
    SELECT id
    FROM notifications
    WHERE user_id IN ('usr_creator_demo', 'usr_subscriber_demo')
  );

DELETE FROM notifications
WHERE user_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM live_chat_messages
WHERE sender_id IN ('usr_creator_demo', 'usr_subscriber_demo')
   OR live_session_id IN (
    SELECT id
    FROM live_sessions
    WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo')
  );

DELETE FROM live_sessions
WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM sales
WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo')
   OR buyer_id IN ('usr_creator_demo', 'usr_subscriber_demo')
   OR product_id IN (
    SELECT id
    FROM products
    WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo')
  )
   OR order_id IN (
    SELECT id
    FROM dm_orders
    WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo')
       OR subscriber_id IN ('usr_creator_demo', 'usr_subscriber_demo')
  );

DELETE FROM dm_messages
WHERE sender_id IN ('usr_creator_demo', 'usr_subscriber_demo')
   OR conversation_id IN (
    SELECT id
    FROM dm_conversations
    WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo')
       OR subscriber_id IN ('usr_creator_demo', 'usr_subscriber_demo')
  );

DELETE FROM dm_orders
WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo')
   OR subscriber_id IN ('usr_creator_demo', 'usr_subscriber_demo')
   OR conversation_id IN (
    SELECT id
    FROM dm_conversations
    WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo')
       OR subscriber_id IN ('usr_creator_demo', 'usr_subscriber_demo')
  )
   OR product_id IN (
    SELECT id
    FROM products
    WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo')
  );

DELETE FROM dm_conversations
WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo')
   OR subscriber_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM subscriptions
WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo')
   OR subscriber_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM products
WHERE creator_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM audit_logs
WHERE actor_user_id IN ('usr_creator_demo', 'usr_subscriber_demo');

DELETE FROM users
WHERE id IN ('usr_creator_demo', 'usr_subscriber_demo')
   OR email IN (
    'creator@hollap.com',
    'student@hollap.com',
    'creator@hollap.dev',
    'student@hollap.dev'
  );
