import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("notification retry queue", () => {
  let db: (typeof import("@/lib/server/db"))["db"];
  let processDeliveryQueue: (typeof import("@/lib/server/notifications"))["processDeliveryQueue"];
  let enqueueNotification: (typeof import("@/lib/server/notifications"))["enqueueNotification"];

  beforeAll(async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    delete (globalThis as { __creatorhubDbPool?: unknown }).__creatorhubDbPool;
    delete (globalThis as { __creatorhubDbInitPromise?: unknown }).__creatorhubDbInitPromise;
    vi.resetModules();

    ({ db } = await import("@/lib/server/db"));
    ({ processDeliveryQueue, enqueueNotification } = await import(
      "@/lib/server/notifications"
    ));
  });

  afterAll(async () => {
    await db.close();
  });

  it("increments attempts when delivery fails", async () => {
    const notificationId = await enqueueNotification({
      userId: "usr_creator_demo",
      type: "system",
      title: "Test",
      message: "Delivery should fail without SMTP",
      channels: ["in_app", "email"],
    });

    const result = await processDeliveryQueue(10);
    expect(result.processed).toBeGreaterThan(0);
    expect(result.failed).toBeGreaterThan(0);

    const row = await db
      .prepare(
        "SELECT status, attempts, last_error FROM notification_deliveries WHERE notification_id = ?"
      )
      .get(notificationId) as { status: string; attempts: number; last_error: string };

    expect(row.attempts).toBe(1);
    expect(["pending", "failed"]).toContain(row.status);
    expect(row.last_error.length).toBeGreaterThan(0);
  });
});