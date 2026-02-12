import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("webhook retry", () => {
  let db: (typeof import("@/lib/server/db"))["db"];
  let createId: (typeof import("@/lib/server/db"))["createId"];
  let nowIso: (typeof import("@/lib/server/db"))["nowIso"];
  let retryFailedStripeWebhooks: (typeof import("@/lib/server/payments"))["retryFailedStripeWebhooks"];

  beforeAll(async () => {
    delete (globalThis as { __creatorhubDbPool?: unknown }).__creatorhubDbPool;
    delete (globalThis as { __creatorhubDbInitPromise?: unknown }).__creatorhubDbInitPromise;
    vi.resetModules();

    ({ db, createId, nowIso } = await import("@/lib/server/db"));
    ({ retryFailedStripeWebhooks } = await import("@/lib/server/payments"));
  });

  afterAll(async () => {
    await db.close();
  });

  it("reprocesses failed stripe webhook events", async () => {
    const eventId = "evt_retry_1";
    const event = {
      id: eventId,
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_unknown",
          metadata: {},
        },
      },
    };

    await db.prepare(
      `
        INSERT INTO webhook_events (
          id,
          provider,
          event_id,
          event_type,
          payload_json,
          status,
          attempts,
          next_attempt_at,
          last_error,
          created_at,
          processed_at
        )
        VALUES (?, 'stripe', ?, ?, ?, 'failed', 1, ?, 'seed', ?, NULL)
      `
    ).run(createId("wh"), eventId, event.type, JSON.stringify(event), nowIso(), nowIso());

    const retried = await retryFailedStripeWebhooks(10);
    expect(retried).toBe(1);

    const row = await db
      .prepare("SELECT status FROM webhook_events WHERE event_id = ?")
      .get(eventId) as { status: string };

    expect(row.status).toBe("processed");
  });
});