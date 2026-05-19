import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("dm order flow", () => {
  let db: (typeof import("@/lib/server/db"))["db"];
  let nowIso: (typeof import("@/lib/server/db"))["nowIso"];
  let createDmOrder: (typeof import("@/lib/server/dm"))["createDmOrder"];
  let markDmOrderCompleted: (typeof import("@/lib/server/dm"))["markDmOrderCompleted"];

  const creatorId = "usr_test_dm_creator";
  const subscriberId = "usr_test_dm_subscriber";
  const productId = "prd_test_dm_flow";
  const conversationId = "dmconv_test_dm_flow";

  beforeAll(async () => {
    delete (globalThis as { __creatorhubDbPool?: unknown }).__creatorhubDbPool;
    delete (globalThis as { __creatorhubDbInitPromise?: unknown }).__creatorhubDbInitPromise;
    vi.resetModules();

    ({ db, nowIso } = await import("@/lib/server/db"));

    const dm = await import("@/lib/server/dm");
    createDmOrder = dm.createDmOrder;
    markDmOrderCompleted = dm.markDmOrderCompleted;

    const passwordHash =
      "$2b$10$q3b1IeroO9szk9hwAcTPS.iJyZlk25c5.xM7.TAVleEjTtqwuFbQu";
    const now = nowIso();

    await db
      .prepare(
        `
          INSERT INTO users (id, name, email, password_hash, role, email_verified_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'creator', ?, ?, ?)
          ON CONFLICT (id) DO NOTHING
        `
      )
      .run(creatorId, "DM Creator", "dm.creator@test.dev", passwordHash, now, now, now);

    await db
      .prepare(
        `
          INSERT INTO users (id, name, email, password_hash, role, email_verified_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'subscriber', ?, ?, ?)
          ON CONFLICT (id) DO NOTHING
        `
      )
      .run(subscriberId, "DM Subscriber", "dm.subscriber@test.dev", passwordHash, now, now, now);

    await db
      .prepare(
        `
          INSERT INTO products (id, creator_id, name, price_cents, stock, sold, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, 0, 1, ?, ?)
          ON CONFLICT (id) DO NOTHING
        `
      )
      .run(productId, creatorId, "DM Flow Test Product", 2499, now, now);

    await db
      .prepare(
        `
          INSERT INTO dm_conversations (id, creator_id, subscriber_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT (id) DO NOTHING
        `
      )
      .run(conversationId, creatorId, subscriberId, now, now);
  });

  afterAll(async () => {
    await db
      .prepare("DELETE FROM dm_orders WHERE creator_id = ? OR subscriber_id = ?")
      .run(creatorId, subscriberId);
    await db
      .prepare("DELETE FROM dm_messages WHERE conversation_id = ?")
      .run(conversationId);
    await db
      .prepare("DELETE FROM dm_conversations WHERE id = ?")
      .run(conversationId);
    await db
      .prepare("DELETE FROM sales WHERE creator_id = ? OR buyer_id = ?")
      .run(creatorId, subscriberId);
    await db.prepare("DELETE FROM products WHERE id = ?").run(productId);
    await db
      .prepare(
        "DELETE FROM notification_deliveries WHERE user_id IN (?, ?) OR notification_id IN (SELECT id FROM notifications WHERE user_id IN (?, ?))"
      )
      .run(creatorId, subscriberId, creatorId, subscriberId);
    await db
      .prepare("DELETE FROM notifications WHERE user_id IN (?, ?)")
      .run(creatorId, subscriberId);
    await db
      .prepare("DELETE FROM audit_logs WHERE actor_user_id IN (?, ?)")
      .run(creatorId, subscriberId);
    await db.prepare("DELETE FROM users WHERE id IN (?, ?)").run(creatorId, subscriberId);
    await db.close();
  });

  it("requires paid state before completion", async () => {
    const order = await createDmOrder({
      creatorId,
      subscriberId,
      conversationId,
      productId,
    });

    await expect(markDmOrderCompleted(order.id, creatorId)).rejects.toThrow(
      "Order must be paid before completion"
    );

    await db
      .prepare(
        "UPDATE dm_orders SET status = 'paid', payment_intent_id = ?, updated_at = ? WHERE id = ?"
      )
      .run("pi_test_dm_flow_1", nowIso(), order.id);

    await markDmOrderCompleted(order.id, creatorId);

    const updated = (await db
      .prepare("SELECT status FROM dm_orders WHERE id = ?")
      .get(order.id)) as { status: string };

    expect(updated.status).toBe("completed");
  });
});
