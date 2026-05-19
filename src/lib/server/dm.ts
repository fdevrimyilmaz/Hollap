import { db, createId, nowIso } from "@/lib/server/db";
import { writeAuditLog } from "@/lib/server/audit";
import { enqueueNotification } from "@/lib/server/notifications";

type ConversationRow = {
  id: string;
  creator_id: string;
  subscriber_id: string;
  created_at: string;
  updated_at: string;
};

const BLOCKED_WORDS = (process.env.DM_BLOCKED_WORDS ?? "scam,fraud")
  .split(",")
  .map((word) => word.trim().toLowerCase())
  .filter(Boolean);

function containsBlockedWord(message: string): boolean {
  const lower = message.toLowerCase();
  return BLOCKED_WORDS.some((word) => lower.includes(word));
}

export async function listConversationsForUser(userId: string): Promise<Array<{
  id: string;
  creatorId: string;
  subscriberId: string;
  withUserName: string;
  updatedAt: string;
}>> {
  const rows = await db
    .prepare(
      `
        SELECT
          c.id,
          c.creator_id,
          c.subscriber_id,
          c.updated_at,
          CASE
            WHEN c.creator_id = @userId THEN subscriber.name
            ELSE creator.name
          END as with_user_name
        FROM dm_conversations c
        JOIN users creator ON creator.id = c.creator_id
        JOIN users subscriber ON subscriber.id = c.subscriber_id
        WHERE c.creator_id = @userId OR c.subscriber_id = @userId
        ORDER BY c.updated_at DESC
      `
    )
    .all({ userId });

  return rows.map((row) => {
    const record = row as {
      id: string;
      creator_id: string;
      subscriber_id: string;
      updated_at: string;
      with_user_name: string;
    };

    return {
      id: record.id,
      creatorId: record.creator_id,
      subscriberId: record.subscriber_id,
      withUserName: record.with_user_name,
      updatedAt: record.updated_at,
    };
  });
}

export async function getOrCreateConversation(params: {
  creatorId: string;
  subscriberId: string;
}): Promise<ConversationRow> {
  const existing = await db
    .prepare(
      "SELECT id, creator_id, subscriber_id, created_at, updated_at FROM dm_conversations WHERE creator_id = ? AND subscriber_id = ?"
    )
    .get(params.creatorId, params.subscriberId) as ConversationRow | undefined;

  if (existing) {
    return existing;
  }

  const row: ConversationRow = {
    id: createId("dmc"),
    creator_id: params.creatorId,
    subscriber_id: params.subscriberId,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  await db.prepare(
    `
      INSERT INTO dm_conversations (id, creator_id, subscriber_id, created_at, updated_at)
      VALUES (@id, @creator_id, @subscriber_id, @created_at, @updated_at)
    `
  ).run(row);

  return row;
}

async function getConversation(conversationId: string): Promise<ConversationRow | undefined> {
  return await db
    .prepare(
      "SELECT id, creator_id, subscriber_id, created_at, updated_at FROM dm_conversations WHERE id = ?"
    )
    .get(conversationId) as ConversationRow | undefined;
}

async function assertConversationAccess(conversationId: string, userId: string): Promise<ConversationRow> {
  const conversation = await getConversation(conversationId);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.creator_id !== userId && conversation.subscriber_id !== userId) {
    throw new Error("Conversation access denied");
  }

  return conversation;
}

export async function listConversationMessages(conversationId: string, userId: string): Promise<Array<{
  id: string;
  senderId: string;
  body: string;
  moderated: boolean;
  createdAt: string;
}>> {
  await assertConversationAccess(conversationId, userId);

  const rows = await db
    .prepare(
      `
        SELECT id, sender_id, body, moderated, created_at
        FROM dm_messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
      `
    )
    .all(conversationId);

  return rows.map((row) => {
    const message = row as {
      id: string;
      sender_id: string;
      body: string;
      moderated: number;
      created_at: string;
    };

    return {
      id: message.id,
      senderId: message.sender_id,
      body: message.body,
      moderated: Boolean(message.moderated),
      createdAt: message.created_at,
    };
  });
}

export async function addConversationMessage(params: {
  conversationId: string;
  senderId: string;
  body: string;
}): Promise<{
  id: string;
  moderated: boolean;
}> {
  const conversation = await assertConversationAccess(params.conversationId, params.senderId);
  const isModerated = containsBlockedWord(params.body);

  const messageId = createId("dmsg");
  const createdAt = nowIso();

  await db.prepare(
    `
      INSERT INTO dm_messages (id, conversation_id, sender_id, body, moderated, created_at)
      VALUES (@id, @conversation_id, @sender_id, @body, @moderated, @created_at)
    `
  ).run({
    id: messageId,
    conversation_id: params.conversationId,
    sender_id: params.senderId,
    body: params.body,
    moderated: isModerated ? 1 : 0,
    created_at: createdAt,
  });

  await db.prepare("UPDATE dm_conversations SET updated_at = ? WHERE id = ?").run(
    createdAt,
    params.conversationId
  );

  if (isModerated) {
    await writeAuditLog({
      actorUserId: params.senderId,
      action: "dm.message_flagged",
      entityType: "dm_message",
      entityId: messageId,
      metadata: {
        conversationId: params.conversationId,
      },
    });
  } else {
    const receiverId =
      conversation.creator_id === params.senderId
        ? conversation.subscriber_id
        : conversation.creator_id;

    await enqueueNotification({
      userId: receiverId,
      type: "dm",
      title: "Yeni DM mesaji",
      message: params.body.slice(0, 120),
      link: "/dashboard",
      channels: ["in_app", "push"],
    });
  }

  return {
    id: messageId,
    moderated: isModerated,
  };
}

export async function createDmOrder(params: {
  creatorId: string;
  subscriberId: string;
  conversationId: string;
  productId: string;
}): Promise<{ id: string; amountCents: number }> {
  const product = await db
    .prepare(
      "SELECT id, price_cents, is_active, stock FROM products WHERE id = ? AND creator_id = ?"
    )
    .get(params.productId, params.creatorId) as
    | { id: string; price_cents: number; is_active: number; stock: number }
    | undefined;

  if (!product) {
    throw new Error("Product not found");
  }

  if (!product.is_active || product.stock <= 0) {
    throw new Error("Product is inactive or out of stock");
  }

  await assertConversationAccess(params.conversationId, params.creatorId);

  const id = createId("dmord");
  const now = nowIso();

  await db.prepare(
    `
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
        @id,
        @conversation_id,
        @creator_id,
        @subscriber_id,
        @product_id,
        'pending',
        @amount_cents,
        NULL,
        NULL,
        NULL,
        @created_at,
        @updated_at
      )
    `
  ).run({
    id,
    conversation_id: params.conversationId,
    creator_id: params.creatorId,
    subscriber_id: params.subscriberId,
    product_id: params.productId,
    amount_cents: product.price_cents,
    created_at: now,
    updated_at: now,
  });

  await writeAuditLog({
    actorUserId: params.creatorId,
    action: "dm.order_created",
    entityType: "dm_order",
    entityId: id,
    metadata: {
      productId: params.productId,
      subscriberId: params.subscriberId,
    },
  });

  return {
    id,
    amountCents: product.price_cents,
  };
}

export async function listDmOrdersForCreator(creatorId: string): Promise<Array<{
  id: string;
  status: string;
  amountCents: number;
  productId: string;
  productName: string;
  buyerId: string;
  buyerName: string;
  paymentLinkUrl: string | null;
  createdAt: string;
}>> {
  const rows = await db
    .prepare(
      `
        SELECT
          o.id,
          o.status,
          o.amount_cents,
          o.product_id,
          p.name as product_name,
          o.subscriber_id,
          u.name as subscriber_name,
          o.payment_link_url,
          o.created_at
        FROM dm_orders o
        JOIN products p ON p.id = o.product_id
        JOIN users u ON u.id = o.subscriber_id
        WHERE o.creator_id = ?
        ORDER BY o.created_at DESC
      `
    )
    .all(creatorId);

  return rows.map((row) => {
    const item = row as {
      id: string;
      status: string;
      amount_cents: number;
      product_id: string;
      product_name: string;
      subscriber_id: string;
      subscriber_name: string;
      payment_link_url: string | null;
      created_at: string;
    };

    return {
      id: item.id,
      status: item.status,
      amountCents: item.amount_cents,
      productId: item.product_id,
      productName: item.product_name,
      buyerId: item.subscriber_id,
      buyerName: item.subscriber_name,
      paymentLinkUrl: item.payment_link_url,
      createdAt: item.created_at,
    };
  });
}

export async function markDmOrderCompleted(orderId: string, actorUserId: string): Promise<void> {
  const order = await db
    .prepare(
      "SELECT id, creator_id, subscriber_id, status, payment_intent_id FROM dm_orders WHERE id = ?"
    )
    .get(orderId) as
    | {
        id: string;
        creator_id: string;
        subscriber_id: string;
        status: string;
        payment_intent_id: string | null;
      }
    | undefined;

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.creator_id !== actorUserId) {
    throw new Error("Only creator can complete order");
  }

  if (order.status !== "paid") {
    throw new Error("Order must be paid before completion");
  }

  // Defense-in-depth: status=paid alone is set by Stripe webhook, but require
  // payment_intent_id so a creator cannot complete an order that lost its
  // payment trail (e.g. webhook regression).
  if (!order.payment_intent_id) {
    throw new Error("Order is marked paid but has no payment reference; cannot complete");
  }

  await db.prepare("UPDATE dm_orders SET status = 'completed', updated_at = ? WHERE id = ?").run(
    nowIso(),
    orderId
  );

  await enqueueNotification({
    userId: order.subscriber_id,
    type: "dm",
    title: "DM siparisiniz tamamlandi",
    message: `Siparis ${orderId} teslim edildi.`,
    link: "/dashboard",
    channels: ["in_app", "email"],
  });

  await writeAuditLog({
    actorUserId,
    action: "dm.order_completed",
    entityType: "dm_order",
    entityId: orderId,
  });
}