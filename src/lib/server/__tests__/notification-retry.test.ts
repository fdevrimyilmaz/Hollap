import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("notification retry queue", () => {
  let db: (typeof import("@/lib/server/db"))["db"];
  let nowIso: (typeof import("@/lib/server/db"))["nowIso"];
  let processDeliveryQueue: (typeof import("@/lib/server/notifications"))["processDeliveryQueue"];
  let enqueueNotification: (typeof import("@/lib/server/notifications"))["enqueueNotification"];

  const userId = "usr_test_notification_retry";

  beforeAll(async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    delete (globalThis as { __creatorhubDbPool?: unknown }).__creatorhubDbPool;
    delete (globalThis as { __creatorhubDbInitPromise?: unknown }).__creatorhubDbInitPromise;
    vi.resetModules();

    ({ db, nowIso } = await import("@/lib/server/db"));
    ({ processDeliveryQueue, enqueueNotification } = await import(
      "@/lib/server/notifications"
    ));

    const passwordHash =
      "$2b$10$q3b1IeroO9szk9hwAcTPS.iJyZlk25c5.xM7.TAVleEjTtqwuFbQu";
    const now = nowIso();

    await db.prepare(
      `
        INSERT INTO users (id, name, email, password_hash, role, email_verified_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'creator', ?, ?, ?)
        ON CONFLICT (id) DO NOTHING
      `
    ).run(userId, "Notification Retry", "notification.retry@test.dev", passwordHash, now, now, now);
  });

  afterAll(async () => {
    await db
      .prepare(
        "DELETE FROM notification_deliveries WHERE user_id = ? OR notification_id IN (SELECT id FROM notifications WHERE user_id = ?)"
      )
      .run(userId, userId);
    await db.prepare("DELETE FROM notifications WHERE user_id = ?").run(userId);
    await db.prepare("DELETE FROM audit_logs WHERE actor_user_id = ?").run(userId);
    await db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    await db.close();
  });

  it("increments attempts when delivery fails", async () => {
    const notificationId = await enqueueNotification({
      userId,
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
