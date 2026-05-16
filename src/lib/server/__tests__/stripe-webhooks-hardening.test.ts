import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STRIPE_API_VERSION } from "@/lib/server/payments";

type WebhookEventRow = {
  id: string;
  provider: string;
  event_id: string;
  event_type: string;
  payload_json: string;
  status: "received" | "processed" | "failed";
  attempts: number;
  next_attempt_at: string | null;
  last_error: string | null;
  created_at: string;
  processed_at: string | null;
};

type SubscriptionRow = {
  id: string;
  creator_id: string;
  subscriber_id: string;
  tier: string;
  active: number;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  stripe_status: string;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
};

const mockState = vi.hoisted(() => {
  let idCounter = 0;
  const webhookEvents = new Map<string, WebhookEventRow>();
  const subscriptions = new Map<string, SubscriptionRow>();

  function nowIso(): string {
    return "2026-02-12T00:00:00.000Z";
  }

  function createId(prefix: string): string {
    idCounter += 1;
    return `${prefix}_${idCounter}`;
  }

  function reset(): void {
    idCounter = 0;
    webhookEvents.clear();
    subscriptions.clear();
  }

  function findWebhookById(id: string): WebhookEventRow | undefined {
    for (const row of webhookEvents.values()) {
      if (row.id === id) {
        return row;
      }
    }

    return undefined;
  }

  function findSubscriptionByStripeId(stripeSubscriptionId: string): SubscriptionRow | undefined {
    for (const row of subscriptions.values()) {
      if (row.stripe_subscription_id === stripeSubscriptionId) {
        return row;
      }
    }

    return undefined;
  }

  const db = {
    prepare(sql: string) {
      const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

      return {
        run(...args: unknown[]) {
          const named =
            args.length === 1 &&
            typeof args[0] === "object" &&
            args[0] !== null &&
            !Array.isArray(args[0])
              ? (args[0] as Record<string, unknown>)
              : null;

          if (normalized.startsWith("insert into webhook_events")) {
            if (!named) {
              throw new Error("Expected named params for webhook insert");
            }

            const key = `${String(named.provider)}:${String(named.event_id)}`;
            if (webhookEvents.has(key)) {
              return { changes: 0 };
            }

            webhookEvents.set(key, {
              id: String(named.id),
              provider: String(named.provider),
              event_id: String(named.event_id),
              event_type: String(named.event_type),
              payload_json: String(named.payload_json),
              status: "received",
              attempts: 0,
              next_attempt_at: null,
              last_error: null,
              created_at: String(named.created_at),
              processed_at: null,
            });

            return { changes: 1 };
          }

          if (
            normalized.startsWith("update webhook_events set event_type = ?, payload_json = ?")
          ) {
            const [eventType, payloadJson, rowId] = args as [string, string, string];
            const row = findWebhookById(rowId);
            if (!row) {
              return { changes: 0 };
            }

            row.event_type = eventType;
            row.payload_json = payloadJson;
            row.status = "received";
            row.next_attempt_at = null;
            row.last_error = null;
            return { changes: 1 };
          }

          if (normalized.startsWith("update webhook_events set status = 'processed'")) {
            const [processedAt, rowId] = args as [string, string];
            const row = findWebhookById(rowId);
            if (!row) {
              return { changes: 0 };
            }

            row.status = "processed";
            row.processed_at = processedAt;
            row.attempts += 1;
            row.next_attempt_at = null;
            row.last_error = null;
            return { changes: 1 };
          }

          if (normalized.startsWith("update webhook_events set status = 'failed'")) {
            const [attempts, nextAttemptAt, lastError, rowId] = args as [
              number,
              string,
              string,
              string,
            ];
            const row = findWebhookById(rowId);
            if (!row) {
              return { changes: 0 };
            }

            row.status = "failed";
            row.attempts = attempts;
            row.next_attempt_at = nextAttemptAt;
            row.last_error = lastError;
            return { changes: 1 };
          }

          if (normalized.startsWith("insert into subscriptions")) {
            if (!named) {
              throw new Error("Expected named params for subscription upsert");
            }

            const compositeKey = `${String(named.creator_id)}:${String(named.subscriber_id)}`;
            const incomingStripeId =
              named.stripe_subscription_id === null
                ? null
                : String(named.stripe_subscription_id);

            if (incomingStripeId) {
              for (const [key, row] of subscriptions.entries()) {
                if (key !== compositeKey && row.stripe_subscription_id === incomingStripeId) {
                  throw new Error("duplicate key value violates unique constraint");
                }
              }
            }

            const existing = subscriptions.get(compositeKey);
            const createdAt = String(named.created_at);
            const updatedAt = String(named.updated_at);

            if (!existing) {
              subscriptions.set(compositeKey, {
                id: String(named.id),
                creator_id: String(named.creator_id),
                subscriber_id: String(named.subscriber_id),
                tier: String(named.tier),
                active: Number(named.active),
                stripe_subscription_id: incomingStripeId,
                stripe_customer_id:
                  named.stripe_customer_id === null ? null : String(named.stripe_customer_id),
                stripe_status: String(named.stripe_status),
                current_period_end:
                  named.current_period_end === null ? null : String(named.current_period_end),
                canceled_at: named.canceled_at === null ? null : String(named.canceled_at),
                created_at: createdAt,
                updated_at: updatedAt,
              });
            } else {
              existing.tier = String(named.tier);
              existing.active = Number(named.active);
              existing.stripe_subscription_id =
                incomingStripeId ?? existing.stripe_subscription_id;
              existing.stripe_customer_id =
                named.stripe_customer_id === null
                  ? existing.stripe_customer_id
                  : String(named.stripe_customer_id);
              existing.stripe_status = String(named.stripe_status);
              existing.current_period_end =
                named.current_period_end === null
                  ? existing.current_period_end
                  : String(named.current_period_end);
              existing.canceled_at =
                named.canceled_at === null ? null : String(named.canceled_at);
              existing.updated_at = updatedAt;
            }

            return { changes: 1 };
          }

          return { changes: 0 };
        },

        get(...args: unknown[]) {
          if (
            normalized ===
            "select id, status, attempts from webhook_events where provider = ? and event_id = ?"
          ) {
            const [provider, eventId] = args as [string, string];
            return webhookEvents.get(`${provider}:${eventId}`);
          }

          if (normalized === "select attempts from webhook_events where id = ?") {
            const [rowId] = args as [string];
            const row = findWebhookById(rowId);
            if (!row) {
              return undefined;
            }

            return { attempts: row.attempts };
          }

          if (
            normalized ===
            "select id, creator_id, subscriber_id, tier from subscriptions where stripe_subscription_id = ?"
          ) {
            const [stripeSubscriptionId] = args as [string];
            const row = findSubscriptionByStripeId(stripeSubscriptionId);
            if (!row) {
              return undefined;
            }

            return {
              id: row.id,
              creator_id: row.creator_id,
              subscriber_id: row.subscriber_id,
              tier: row.tier,
            };
          }

          return undefined;
        },

        all(...args: unknown[]) {
          if (
            normalized.includes("select id, event_id, event_type, payload_json from webhook_events")
          ) {
            const [thresholdIso, limitRaw] = args as [string, number];
            const threshold = new Date(thresholdIso).getTime();
            const limit = Number(limitRaw);
            const rows = Array.from(webhookEvents.values())
              .filter((row) => row.provider === "stripe" && row.status === "failed")
              .filter((row) => {
                if (!row.next_attempt_at) {
                  return true;
                }

                return new Date(row.next_attempt_at).getTime() <= threshold;
              })
              .sort((a, b) => a.created_at.localeCompare(b.created_at))
              .slice(0, limit)
              .map((row) => ({
                id: row.id,
                event_id: row.event_id,
                event_type: row.event_type,
                payload_json: row.payload_json,
              }));

            return rows;
          }

          return [];
        },
      };
    },

    transaction<T>(fn: () => T): () => T {
      return fn;
    },
  };

  return {
    db,
    createId,
    nowIso,
    reset,
    webhookEvents,
    subscriptions,
  };
});

vi.mock("@/lib/server/db", () => ({
  db: mockState.db,
  createId: mockState.createId,
  nowIso: mockState.nowIso,
}));

vi.mock("@/lib/server/notifications", () => ({
  enqueueNotification: vi.fn(),
}));

vi.mock("@/lib/server/audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("@/lib/server/logger", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

let processStripeWebhook: (typeof import("@/lib/server/payments"))["processStripeWebhook"];
let StripeWebhookSignatureError: (typeof import("@/lib/server/payments"))["StripeWebhookSignatureError"];

function signWebhookPayload(payload: string): string {
  const stripe = new Stripe("sk_test_unit", {
    apiVersion: STRIPE_API_VERSION,
  });

  return stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  });
}

async function dispatchEvent(event: Record<string, unknown>): Promise<{ duplicate: boolean }> {
  const payload = JSON.stringify(event);
  const signature = signWebhookPayload(payload);
  return processStripeWebhook({
    rawBody: payload,
    signature,
  });
}

beforeEach(async () => {
  mockState.reset();
  process.env.STRIPE_SECRET_KEY = "sk_test_unit";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_unit";
  vi.resetModules();

  ({ processStripeWebhook, StripeWebhookSignatureError } = await import("@/lib/server/payments"));
});

describe("stripe webhook hardening", () => {
  it("rejects invalid signatures", async () => {
    const payload = JSON.stringify({
      id: "evt_sig_fail",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_sig_fail",
        },
      },
    });

    await expect(
      processStripeWebhook({
        rawBody: payload,
        signature: "t=123,v1=bad",
      })
    ).rejects.toBeInstanceOf(StripeWebhookSignatureError);

    expect(mockState.webhookEvents.size).toBe(0);
  });

  it("stores event IDs and treats processed events as duplicate", async () => {
    const event = {
      id: "evt_idempotent_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_idempotent_1",
          mode: "subscription",
          subscription: "sub_idempotent_1",
          customer: "cus_idempotent_1",
          metadata: {
            creatorId: "usr_creator_demo",
            subscriberId: "usr_subscriber_demo",
            tier: "vip",
          },
        },
      },
    };

    const first = await dispatchEvent(event);
    const second = await dispatchEvent(event);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(mockState.webhookEvents.size).toBe(1);

    const row = mockState.webhookEvents.get("stripe:evt_idempotent_1");
    expect(row?.status).toBe("processed");
  });

  it("updates subscription state for key Stripe events", async () => {
    await dispatchEvent({
      id: "evt_checkout_sub",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_sub_1",
          mode: "subscription",
          subscription: "sub_harden_1",
          customer: "cus_harden_1",
          metadata: {
            creatorId: "usr_creator_demo",
            subscriberId: "usr_subscriber_demo",
            tier: "vip",
          },
        },
      },
    });

    let subscription = mockState.subscriptions.get("usr_creator_demo:usr_subscriber_demo");
    expect(subscription?.stripe_status).toBe("active");
    expect(subscription?.active).toBe(1);

    await dispatchEvent({
      id: "evt_invoice_failed",
      type: "invoice.payment_failed",
      data: {
        object: {
          id: "in_failed_1",
          subscription: "sub_harden_1",
          customer: "cus_harden_1",
          lines: {
            data: [
              {
                period: {
                  end: 1798761600,
                },
              },
            ],
          },
        },
      },
    });

    subscription = mockState.subscriptions.get("usr_creator_demo:usr_subscriber_demo");
    expect(subscription?.stripe_status).toBe("past_due");
    expect(subscription?.active).toBe(0);

    await dispatchEvent({
      id: "evt_invoice_paid",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_paid_1",
          subscription: "sub_harden_1",
          customer: "cus_harden_1",
          lines: {
            data: [
              {
                period: {
                  end: 1801353600,
                },
              },
            ],
          },
        },
      },
    });

    subscription = mockState.subscriptions.get("usr_creator_demo:usr_subscriber_demo");
    expect(subscription?.stripe_status).toBe("active");
    expect(subscription?.active).toBe(1);

    await dispatchEvent({
      id: "evt_sub_updated",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_harden_1",
          customer: "cus_harden_1",
          status: "trialing",
          current_period_end: 1804032000,
          metadata: {
            creatorId: "usr_creator_demo",
            subscriberId: "usr_subscriber_demo",
            tier: "pro",
          },
        },
      },
    });

    subscription = mockState.subscriptions.get("usr_creator_demo:usr_subscriber_demo");
    expect(subscription?.stripe_status).toBe("trialing");
    expect(subscription?.active).toBe(1);
    expect(subscription?.tier).toBe("pro");

    await dispatchEvent({
      id: "evt_sub_deleted",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_harden_1",
          customer: "cus_harden_1",
          status: "canceled",
          canceled_at: 1806624000,
          metadata: {
            creatorId: "usr_creator_demo",
            subscriberId: "usr_subscriber_demo",
            tier: "pro",
          },
        },
      },
    });

    subscription = mockState.subscriptions.get("usr_creator_demo:usr_subscriber_demo");
    expect(subscription?.stripe_status).toBe("canceled");
    expect(subscription?.active).toBe(0);
    expect(subscription?.canceled_at).toBe("2027-04-02T00:00:00.000Z");
  });
});
