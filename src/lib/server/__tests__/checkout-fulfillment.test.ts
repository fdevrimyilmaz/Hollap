import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { STRIPE_API_VERSION } from "@/lib/server/payments";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;

describeDb("checkout fulfillment", () => {
  let db: (typeof import("@/lib/server/db"))["db"];
  let nowIso: (typeof import("@/lib/server/db"))["nowIso"];
  let processStripeWebhook: (typeof import("@/lib/server/payments"))["processStripeWebhook"];

  const creatorId = "usr_test_checkout_creator";
  const buyerId = "usr_test_checkout_buyer";
  const productId = "prd_test_checkout";
  const paymentIntentId = "pi_test_checkout_1";
  const tipPaymentIntentId = "pi_test_tip_1";

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_checkout";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_checkout_test";

    delete (globalThis as { __creatorhubDbPool?: unknown }).__creatorhubDbPool;
    delete (globalThis as { __creatorhubDbInitPromise?: unknown }).__creatorhubDbInitPromise;
    vi.resetModules();

    ({ db, nowIso } = await import("@/lib/server/db"));
    ({ processStripeWebhook } = await import("@/lib/server/payments"));

    const passwordHash =
      "$2b$10$q3b1IeroO9szk9hwAcTPS.iJyZlk25c5.xM7.TAVleEjTtqwuFbQu";
    const now = nowIso();

    await db.prepare(
      `
        INSERT INTO users (id, name, email, password_hash, role, email_verified_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'creator', ?, ?, ?)
        ON CONFLICT (id) DO NOTHING
      `
    ).run(creatorId, "Checkout Creator", "checkout.creator@test.dev", passwordHash, now, now, now);

    await db.prepare(
      `
        INSERT INTO users (id, name, email, password_hash, role, email_verified_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'subscriber', ?, ?, ?)
        ON CONFLICT (id) DO NOTHING
      `
    ).run(buyerId, "Checkout Buyer", "checkout.buyer@test.dev", passwordHash, now, now, now);

    await db.prepare("DELETE FROM sales WHERE product_id = ?").run(productId);
    await db.prepare("DELETE FROM products WHERE id = ?").run(productId);
    await db
      .prepare("DELETE FROM creator_tips WHERE creator_id = ? OR tipper_id = ?")
      .run(creatorId, buyerId);

    await db.prepare(
      `
        INSERT INTO products (id, creator_id, name, price_cents, stock, sold, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 0, 1, ?, ?)
      `
    ).run(productId, creatorId, "Checkout Test Product", 1999, now, now);
  });

  afterAll(async () => {
    await db
      .prepare("DELETE FROM creator_tips WHERE creator_id = ? OR tipper_id = ?")
      .run(creatorId, buyerId);
    await db.prepare("DELETE FROM sales WHERE product_id = ?").run(productId);
    await db.prepare("DELETE FROM products WHERE id = ?").run(productId);
    await db.prepare("DELETE FROM users WHERE id IN (?, ?)").run(creatorId, buyerId);
    await db.close();
  });

  it("fulfills checkout.session.completed without orderId when flow=checkout", async () => {
    const event = {
      id: "evt_checkout_fulfillment_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_checkout_fulfillment_1",
          mode: "payment",
          payment_intent: paymentIntentId,
          amount_total: 1999,
          metadata: {
            flow: "checkout",
            buyerId,
            creatorId,
            productId,
          },
        },
      },
    };

    const payload = JSON.stringify(event);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_checkout", {
      apiVersion: STRIPE_API_VERSION,
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    });

    const result = await processStripeWebhook({
      rawBody: payload,
      signature,
    });

    expect(result.duplicate).toBe(false);

    const sale = await db
      .prepare("SELECT id, amount_cents FROM sales WHERE payment_ref = ?")
      .get(paymentIntentId) as { id: string; amount_cents: number } | undefined;
    expect(sale).toBeDefined();
    expect(sale?.amount_cents).toBe(1999);

    const product = await db
      .prepare("SELECT stock, sold FROM products WHERE id = ?")
      .get(productId) as { stock: number; sold: number };

    expect(product.stock).toBe(0);
    expect(product.sold).toBe(1);
  });

  it("fulfills checkout.session.completed when flow=tip", async () => {
    const event = {
      id: "evt_tip_fulfillment_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_tip_fulfillment_1",
          mode: "payment",
          payment_intent: tipPaymentIntentId,
          amount_total: 750,
          metadata: {
            flow: "tip",
            tipId: "tip_test_fulfillment_1",
            tipperId: buyerId,
            creatorId,
          },
        },
      },
    };

    const payload = JSON.stringify(event);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_checkout", {
      apiVersion: STRIPE_API_VERSION,
    });
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    });

    const result = await processStripeWebhook({
      rawBody: payload,
      signature,
    });

    expect(result.duplicate).toBe(false);

    const tip = await db
      .prepare(
        "SELECT id, amount_cents, status, payment_ref FROM creator_tips WHERE payment_ref = ?"
      )
      .get(tipPaymentIntentId) as
      | { id: string; amount_cents: number; status: string; payment_ref: string | null }
      | undefined;

    expect(tip).toBeDefined();
    expect(tip?.id).toBe("tip_test_fulfillment_1");
    expect(tip?.amount_cents).toBe(750);
    expect(tip?.status).toBe("paid");
  });
});
