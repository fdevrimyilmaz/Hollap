import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("dm order flow", () => {
  let db: (typeof import("@/lib/server/db"))["db"];
  let nowIso: (typeof import("@/lib/server/db"))["nowIso"];
  let createDmOrder: (typeof import("@/lib/server/dm"))["createDmOrder"];
  let markDmOrderCompleted: (typeof import("@/lib/server/dm"))["markDmOrderCompleted"];

  beforeAll(async () => {
    delete (globalThis as { __creatorhubDbPool?: unknown }).__creatorhubDbPool;
    delete (globalThis as { __creatorhubDbInitPromise?: unknown }).__creatorhubDbInitPromise;
    vi.resetModules();

    ({ db, nowIso } = await import("@/lib/server/db"));

    const dm = await import("@/lib/server/dm");
    createDmOrder = dm.createDmOrder;
    markDmOrderCompleted = dm.markDmOrderCompleted;
  });

  afterAll(async () => {
    await db.close();
  });

  it("requires paid state before completion", async () => {
    const order = await createDmOrder({
      creatorId: "usr_creator_demo",
      subscriberId: "usr_subscriber_demo",
      conversationId: "dm-conv-1",
      productId: "prd-1",
    });

    await expect(markDmOrderCompleted(order.id, "usr_creator_demo")).rejects.toThrow(
      "Order must be paid before completion"
    );

    await db.prepare("UPDATE dm_orders SET status = 'paid', updated_at = ? WHERE id = ?").run(
      nowIso(),
      order.id
    );

    await markDmOrderCompleted(order.id, "usr_creator_demo");

    const updated = await db
      .prepare("SELECT status FROM dm_orders WHERE id = ?")
      .get(order.id) as { status: string };

    expect(updated.status).toBe("completed");
  });
});