import Stripe from "stripe";
import { writeAuditLog } from "@/lib/server/audit";
import { createId, db, nowIso } from "@/lib/server/db";
import { logError, logInfo, logWarn } from "@/lib/server/logger";
import { enqueueNotification } from "@/lib/server/notifications";
import { subscriptionStatusGrantsAccess } from "@/lib/server/subscriptions";

type DmOrderRow = {
  id: string;
  creator_id: string;
  subscriber_id: string;
  product_id: string;
  status: "pending" | "payment_link_sent" | "paid" | "completed" | "failed" | "refunded";
  amount_cents: number;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  price_cents: number;
};

type WebhookEventStatus = "received" | "processed" | "failed";

type WebhookEventRow = {
  id: string;
  status: WebhookEventStatus;
  attempts: number;
};

type SubscriptionRow = {
  id: string;
  creator_id: string;
  subscriber_id: string;
  tier: string;
};

type CreatorTipStatus = "pending" | "paid" | "failed" | "refunded";

type CreatorTipRow = {
  id: string;
  creator_id: string;
  tipper_id: string;
  amount_cents: number;
  status: CreatorTipStatus;
  payment_ref: string | null;
};

let stripeClient: Stripe | null = null;

// Pinned to the API version the installed Stripe SDK was tested against.
// Bump together with the `stripe` package; never edit independently.
export const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2026-01-28.clover";

export class StripeWebhookSignatureError extends Error {
  constructor() {
    super("Invalid Stripe webhook signature");
    this.name = "StripeWebhookSignatureError";
  }
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

function getStripeClient(): Stripe {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });

  return stripeClient;
}

export async function createCheckoutSession(params: {
  customerEmail: string;
  productName: string;
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey?: string;
  metadata?: Record<string, string>;
}): Promise<{ id: string; url: string }> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: params.customerEmail,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: params.amountCents,
            product_data: {
              name: params.productName,
            },
          },
        },
      ],
      metadata: params.metadata,
    },
    params.idempotencyKey
      ? {
          idempotencyKey: params.idempotencyKey,
        }
      : undefined
  );

  if (!session.url) {
    throw new Error("Stripe checkout session URL is missing");
  }

  return {
    id: session.id,
    url: session.url,
  };
}

export async function createDmOrderPaymentLink(params: {
  orderId: string;
  actorCreatorId: string;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey?: string;
}): Promise<{ checkoutSessionId: string; url: string }> {
  const order = await db
    .prepare(
      `
        SELECT id, creator_id, subscriber_id, product_id, status, amount_cents, checkout_session_id, payment_intent_id
        FROM dm_orders
        WHERE id = ?
      `
    )
    .get(params.orderId) as DmOrderRow | undefined;

  if (!order) {
    throw new Error("DM order not found");
  }

  if (order.creator_id !== params.actorCreatorId) {
    throw new Error("Order access denied");
  }

  const subscriber = await db
    .prepare("SELECT email FROM users WHERE id = ?")
    .get(order.subscriber_id) as { email: string } | undefined;

  const product = await db
    .prepare("SELECT id, name, price_cents FROM products WHERE id = ?")
    .get(order.product_id) as ProductRow | undefined;

  if (!subscriber || !product) {
    throw new Error("Order dependencies are missing");
  }

  const session = await createCheckoutSession({
    customerEmail: subscriber.email,
    productName: product.name,
    amountCents: order.amount_cents,
    successUrl: params.successUrl,
    cancelUrl: params.cancelUrl,
    idempotencyKey: params.idempotencyKey,
    metadata: {
      orderId: order.id,
      creatorId: order.creator_id,
      subscriberId: order.subscriber_id,
      productId: order.product_id,
      flow: "dm",
    },
  });

  await db.prepare(
    `
      UPDATE dm_orders
      SET status = 'payment_link_sent',
          checkout_session_id = ?,
          payment_link_url = ?,
          updated_at = ?
      WHERE id = ?
    `
  ).run(session.id, session.url, nowIso(), order.id);

  await writeAuditLog({
    actorUserId: order.creator_id,
    action: "payment.link_created",
    entityType: "dm_order",
    entityId: order.id,
    metadata: {
      checkoutSessionId: session.id,
      amountCents: order.amount_cents,
    },
  });

  await enqueueNotification({
    userId: order.subscriber_id,
    type: "dm",
    title: "DM odeme linki hazir",
    message: `${product.name} siparisiniz icin odeme linki olusturuldu.`,
    link: session.url,
    channels: ["in_app", "email"],
  });

  return {
    checkoutSessionId: session.id,
    url: session.url,
  };
}

function resolveExpandableId(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "string"
  ) {
    return (value as { id: string }).id;
  }

  return null;
}

function readMetadataValue(
  metadata: Stripe.Metadata | null | undefined,
  key: string
): string | null {
  const raw = metadata?.[key];
  if (typeof raw !== "string") {
    return null;
  }

  const value = raw.trim();
  return value.length > 0 ? value : null;
}

function unixToIso(unixSeconds: number | null | undefined): string | null {
  if (typeof unixSeconds !== "number" || !Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return null;
  }

  return new Date(unixSeconds * 1000).toISOString();
}

function formatCurrencyFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function sanitizeWebhookError(error: unknown): string {
  if (error instanceof StripeWebhookSignatureError) {
    return "invalid_signature";
  }

  if (error instanceof Error) {
    if (error.name && error.name !== "Error") {
      return error.name;
    }

    return "processing_error";
  }

  return "unknown_error";
}

async function registerWebhookEvent(params: {
  provider: string;
  eventId: string;
  eventType: string;
  payloadJson: string;
}): Promise<{ eventRowId: string; duplicate: boolean }> {
  const newRowId = createId("wh");

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
      VALUES (
        @id,
        @provider,
        @event_id,
        @event_type,
        @payload_json,
        'received',
        0,
        NULL,
        NULL,
        @created_at,
        NULL
      )
      ON CONFLICT (provider, event_id) DO NOTHING
    `
  ).run({
    id: newRowId,
    provider: params.provider,
    event_id: params.eventId,
    event_type: params.eventType,
    payload_json: params.payloadJson,
    created_at: nowIso(),
  });

  const row = await db
    .prepare(
      "SELECT id, status, attempts FROM webhook_events WHERE provider = ? AND event_id = ?"
    )
    .get(params.provider, params.eventId) as WebhookEventRow | undefined;

  if (!row) {
    throw new Error("Unable to register webhook event");
  }

  if (row.status === "processed") {
    return { eventRowId: row.id, duplicate: true };
  }

  if (row.id !== newRowId) {
    await db.prepare(
      `
        UPDATE webhook_events
        SET event_type = ?,
            payload_json = ?,
            status = 'received',
            next_attempt_at = NULL,
            last_error = NULL
        WHERE id = ?
      `
    ).run(params.eventType, params.payloadJson, row.id);
  }

  return { eventRowId: row.id, duplicate: false };
}

async function markWebhookProcessed(rowId: string): Promise<void> {
  await db.prepare(
    `
      UPDATE webhook_events
      SET status = 'processed',
          processed_at = ?,
          attempts = attempts + 1,
          next_attempt_at = NULL,
          last_error = NULL
      WHERE id = ?
    `
  ).run(nowIso(), rowId);
}

async function markWebhookFailed(rowId: string, error: unknown): Promise<void> {
  const row = await db
    .prepare("SELECT attempts FROM webhook_events WHERE id = ?")
    .get(rowId) as { attempts: number } | undefined;

  const nextAttempts = (row?.attempts ?? 0) + 1;
  const retryAt = new Date(Date.now() + Math.min(60, 2 ** nextAttempts) * 60 * 1000).toISOString();

  await db.prepare(
    `
      UPDATE webhook_events
      SET status = 'failed',
          attempts = ?,
          next_attempt_at = ?,
          last_error = ?
      WHERE id = ?
    `
  ).run(nextAttempts, retryAt, sanitizeWebhookError(error), rowId);
}

async function findSubscriptionByStripeId(
  stripeSubscriptionId: string
): Promise<SubscriptionRow | undefined> {
  return await db
    .prepare(
      `
        SELECT id, creator_id, subscriber_id, tier
        FROM subscriptions
        WHERE stripe_subscription_id = ?
      `
    )
    .get(stripeSubscriptionId) as SubscriptionRow | undefined;
}

async function upsertSubscriptionState(params: {
  creatorId: string;
  subscriberId: string;
  tier: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
  stripeStatus: string;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
}): Promise<void> {
  const active = subscriptionStatusGrantsAccess(params.stripeStatus) ? 1 : 0;
  const timestamp = nowIso();

  await db.prepare(
    `
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
        @id,
        @creator_id,
        @subscriber_id,
        @tier,
        @active,
        @stripe_subscription_id,
        @stripe_customer_id,
        @stripe_status,
        @current_period_end,
        @canceled_at,
        @created_at,
        @updated_at
      )
      ON CONFLICT (creator_id, subscriber_id) DO UPDATE SET
        tier = EXCLUDED.tier,
        active = EXCLUDED.active,
        stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
        stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
        stripe_status = EXCLUDED.stripe_status,
        current_period_end = COALESCE(EXCLUDED.current_period_end, subscriptions.current_period_end),
        canceled_at = EXCLUDED.canceled_at,
        updated_at = EXCLUDED.updated_at
    `
  ).run({
    id: createId("sub"),
    creator_id: params.creatorId,
    subscriber_id: params.subscriberId,
    tier: params.tier,
    active,
    stripe_subscription_id: params.stripeSubscriptionId,
    stripe_customer_id: params.stripeCustomerId,
    stripe_status: params.stripeStatus,
    current_period_end: params.currentPeriodEnd,
    canceled_at: params.canceledAt,
    created_at: timestamp,
    updated_at: timestamp,
  });
}

async function syncSubscriptionState(params: {
  stripeSubscriptionId: string;
  stripeCustomerId: string | null;
  stripeStatus: string;
  metadata?: Stripe.Metadata | null;
  tier?: string | null;
  currentPeriodEnd?: string | null;
  canceledAt?: string | null;
}): Promise<void> {
  const existing = await findSubscriptionByStripeId(params.stripeSubscriptionId);
  const creatorId = readMetadataValue(params.metadata, "creatorId") ?? existing?.creator_id;
  const subscriberId = readMetadataValue(params.metadata, "subscriberId") ?? existing?.subscriber_id;
  const tier = readMetadataValue(params.metadata, "tier") ?? params.tier ?? existing?.tier ?? "standard";

  if (!creatorId || !subscriberId) {
    throw new Error(`Subscription identity is missing for ${params.stripeSubscriptionId}`);
  }

  await upsertSubscriptionState({
    creatorId,
    subscriberId,
    tier,
    stripeSubscriptionId: params.stripeSubscriptionId,
    stripeCustomerId: params.stripeCustomerId,
    stripeStatus: params.stripeStatus,
    currentPeriodEnd: params.currentPeriodEnd ?? null,
    canceledAt: params.canceledAt ?? null,
  });
}

function readInvoiceMetadata(invoice: Stripe.Invoice): Stripe.Metadata | null {
  const lineMetadata = invoice.lines?.data?.[0]?.metadata;
  if (lineMetadata) {
    return lineMetadata;
  }

  const withSubscriptionDetails = invoice as Stripe.Invoice & {
    subscription_details?: { metadata?: Stripe.Metadata } | null;
  };

  if (withSubscriptionDetails.subscription_details?.metadata) {
    return withSubscriptionDetails.subscription_details.metadata;
  }

  return invoice.metadata ?? null;
}

function readInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const withSubscription = invoice as Stripe.Invoice & {
    subscription?: string | { id?: string } | null;
  };

  return resolveExpandableId(withSubscription.subscription);
}

function readSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription): string | null {
  const withCurrentPeriod = subscription as Stripe.Subscription & {
    current_period_end?: number | null;
  };

  return unixToIso(withCurrentPeriod.current_period_end);
}

function readPaymentRefFromCheckoutSession(session: Stripe.Checkout.Session): string {
  const paymentIntentId = resolveExpandableId(session.payment_intent);
  if (paymentIntentId) {
    return paymentIntentId;
  }

  return session.id;
}

async function tryAutoRefundPaymentIntent(
  paymentIntentId: string | null,
  reason: string
): Promise<boolean> {
  if (!paymentIntentId) {
    return false;
  }

  try {
    const stripe = getStripeClient();
    await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        metadata: {
          source: "hollap_auto",
          reason,
        },
      },
      {
        idempotencyKey: `auto_refund_${paymentIntentId}`,
      }
    );
    return true;
  } catch (error) {
    logError("stripe.refund.auto_failed", {
      paymentIntentId,
      reason,
      error: sanitizeWebhookError(error),
    });
    return false;
  }
}

async function handleMarketplaceCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const metadata = session.metadata ?? null;
  const buyerId =
    readMetadataValue(metadata, "buyerId") ??
    readMetadataValue(metadata, "subscriberId") ??
    readMetadataValue(metadata, "userId");
  const creatorId = readMetadataValue(metadata, "creatorId");
  const productId = readMetadataValue(metadata, "productId");
  const paymentRef = readPaymentRefFromCheckoutSession(session);

  if (!buyerId || !creatorId || !productId) {
    await writeAuditLog({
      actorUserId: buyerId,
      action: "payment.checkout_completed_missing_metadata",
      entityType: "checkout_session",
      entityId: session.id,
      metadata: {
        buyerId: buyerId ?? null,
        creatorId: creatorId ?? null,
        productId: productId ?? null,
        metadataKeys: metadata ? Object.keys(metadata).sort() : [],
      },
    });
    return;
  }

  const fulfillment = await db.transaction(async () => {
    let amountCents = typeof session.amount_total === "number" ? session.amount_total : 0;
    let productName = "Urun";

    const existingSale = await db
      .prepare("SELECT id FROM sales WHERE payment_ref = ?")
      .get(paymentRef) as { id: string } | undefined;

    if (existingSale) {
      return { state: "duplicate" as const, amountCents, productName };
    }

    const product = await db
      .prepare(
        `
          SELECT id, creator_id, name, price_cents, stock, is_active
          FROM products
          WHERE id = ?
        `
      )
      .get(productId) as
      | { id: string; creator_id: string; name: string; price_cents: number; stock: number; is_active: number }
      | undefined;

    if (!product || !product.is_active || product.creator_id !== creatorId) {
      return { state: "invalid_product" as const, amountCents, productName };
    }

    productName = product.name;
    amountCents = amountCents > 0 ? amountCents : product.price_cents;

    const stockResult = await db.prepare(
      `
        UPDATE products
        SET stock = stock - 1,
            sold = sold + 1,
            updated_at = ?
        WHERE id = ?
          AND is_active = 1
          AND stock > 0
      `
    ).run(nowIso(), product.id);

    if (stockResult.changes === 0) {
      return { state: "out_of_stock" as const, amountCents, productName };
    }

    await db.prepare(
      `
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
        VALUES (?, ?, ?, ?, NULL, ?, 'checkout', 'stripe', ?, ?)
      `
    ).run(
      createId("sale"),
      creatorId,
      buyerId,
      product.id,
      amountCents,
      paymentRef,
      nowIso()
    );

    return { state: "fulfilled" as const, amountCents, productName };
  });

  const fulfillmentState = fulfillment.state;
  const amountCents = fulfillment.amountCents;
  const productName = fulfillment.productName;

  if (fulfillmentState === "duplicate") {
    return;
  }

  if (fulfillmentState === "invalid_product" || fulfillmentState === "out_of_stock") {
    const refunded = await tryAutoRefundPaymentIntent(
      resolveExpandableId(session.payment_intent),
      fulfillmentState
    );

    await enqueueNotification({
      userId: buyerId,
      type: "system",
      title: "Odeme iade surecine alindi",
      message:
        fulfillmentState === "out_of_stock"
          ? "Urun stokta kalmadi. Odemeniz otomatik iade surecine alindi."
          : "Urun dogrulanamadi. Odemeniz otomatik iade surecine alindi.",
      link: "/checkout",
      channels: ["in_app", "email"],
    });

    await writeAuditLog({
      actorUserId: buyerId,
      action: "payment.checkout_refund_triggered",
      entityType: "checkout_session",
      entityId: session.id,
      metadata: {
        reason: fulfillmentState,
        refunded,
        paymentIntentId: resolveExpandableId(session.payment_intent),
      },
    });

    return;
  }

  await enqueueNotification({
    userId: creatorId,
    type: "sale",
    title: "Yeni satis",
    message: `${productName} urununuz satin alindi.`,
    link: "/dashboard",
    channels: ["in_app", "email", "push"],
  });

  await enqueueNotification({
    userId: buyerId,
    type: "sale",
    title: "Odemeniz onaylandi",
    message: `${productName} satin alma isleminiz basariyla tamamlandi.`,
    link: "/dashboard",
    channels: ["in_app", "email"],
  });

  await writeAuditLog({
    actorUserId: buyerId,
    action: "payment.checkout_completed",
    entityType: "sale",
    entityId: paymentRef,
    metadata: {
      checkoutSessionId: session.id,
      productId,
      creatorId,
      amountCents,
    },
  });
}

async function handleTipCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const metadata = session.metadata ?? null;
  const tipIdFromMetadata = readMetadataValue(metadata, "tipId");
  const creatorId = readMetadataValue(metadata, "creatorId");
  const tipperId =
    readMetadataValue(metadata, "tipperId") ??
    readMetadataValue(metadata, "buyerId") ??
    readMetadataValue(metadata, "subscriberId") ??
    readMetadataValue(metadata, "userId");
  const paymentRef = readPaymentRefFromCheckoutSession(session);

  const fulfillment = await db.transaction(async () => {
    const existingTip = await db
      .prepare(
        `
          SELECT id, creator_id, tipper_id, amount_cents, status, payment_ref
          FROM creator_tips
          WHERE payment_ref = ?
        `
      )
      .get(paymentRef) as CreatorTipRow | undefined;

    if (existingTip) {
      return { state: "duplicate" as const };
    }

    if (!creatorId || !tipperId) {
      return { state: "missing_identity" as const };
    }

    if (creatorId === tipperId) {
      return { state: "self_tip" as const };
    }

    const creator = await db
      .prepare("SELECT id, name, role FROM users WHERE id = ?")
      .get(creatorId) as { id: string; name: string; role: string } | undefined;
    const tipper = await db
      .prepare("SELECT id, name FROM users WHERE id = ?")
      .get(tipperId) as { id: string; name: string } | undefined;

    if (!creator || creator.role !== "creator" || !tipper) {
      return { state: "invalid_participants" as const };
    }

    let amountCents = typeof session.amount_total === "number" ? session.amount_total : 0;

    if (amountCents <= 0 && tipIdFromMetadata) {
      const pendingTip = await db
        .prepare("SELECT amount_cents FROM creator_tips WHERE id = ?")
        .get(tipIdFromMetadata) as { amount_cents: number } | undefined;
      amountCents = pendingTip?.amount_cents ?? 0;
    }

    if (amountCents <= 0) {
      return { state: "invalid_amount" as const };
    }

    const tipId = tipIdFromMetadata ?? createId("tip");
    const paymentIntentId = resolveExpandableId(session.payment_intent);
    const timestamp = nowIso();

    await db.prepare(
      `
        INSERT INTO creator_tips (
          id,
          creator_id,
          tipper_id,
          amount_cents,
          status,
          checkout_session_id,
          payment_intent_id,
          payment_provider,
          payment_ref,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, 'paid', ?, ?, 'stripe', ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          creator_id = EXCLUDED.creator_id,
          tipper_id = EXCLUDED.tipper_id,
          amount_cents = EXCLUDED.amount_cents,
          status = 'paid',
          checkout_session_id = COALESCE(EXCLUDED.checkout_session_id, creator_tips.checkout_session_id),
          payment_intent_id = COALESCE(EXCLUDED.payment_intent_id, creator_tips.payment_intent_id),
          payment_provider = EXCLUDED.payment_provider,
          payment_ref = COALESCE(EXCLUDED.payment_ref, creator_tips.payment_ref),
          updated_at = EXCLUDED.updated_at
      `
    ).run(
      tipId,
      creator.id,
      tipper.id,
      amountCents,
      session.id,
      paymentIntentId,
      paymentRef,
      timestamp,
      timestamp
    );

    return {
      state: "fulfilled" as const,
      tipId,
      creatorId: creator.id,
      creatorName: creator.name,
      tipperId: tipper.id,
      tipperName: tipper.name,
      amountCents,
    };
  });

  if (fulfillment.state === "duplicate") {
    return;
  }

  if (fulfillment.state !== "fulfilled") {
    const refunded = await tryAutoRefundPaymentIntent(
      resolveExpandableId(session.payment_intent),
      `tip_${fulfillment.state}`
    );

    if (tipperId) {
      await enqueueNotification({
        userId: tipperId,
        type: "system",
        title: "Bahsis iade surecine alindi",
        message: "Bahsis odemesi dogrulanamadi ve otomatik iade surecine alindi.",
        link: "/creators",
        channels: ["in_app", "email"],
      });
    }

    await writeAuditLog({
      actorUserId: tipperId,
      action: "payment.tip_refund_triggered",
      entityType: "checkout_session",
      entityId: session.id,
      metadata: {
        reason: fulfillment.state,
        refunded,
        creatorId,
        tipperId,
        paymentIntentId: resolveExpandableId(session.payment_intent),
      },
    });

    return;
  }

  const amountLabel = formatCurrencyFromCents(fulfillment.amountCents);

  await enqueueNotification({
    userId: fulfillment.creatorId,
    type: "sale",
    title: "Yeni bahsis",
    message: `${fulfillment.tipperName} size ${amountLabel} bahsis gonderdi.`,
    link: "/dashboard",
    channels: ["in_app", "email", "push"],
  });

  await enqueueNotification({
    userId: fulfillment.tipperId,
    type: "sale",
    title: "Bahsis gonderildi",
    message: `${fulfillment.creatorName} icin ${amountLabel} bahsisiniz basariyla gonderildi.`,
    link: "/dashboard",
    channels: ["in_app", "email"],
  });

  await writeAuditLog({
    actorUserId: fulfillment.tipperId,
    action: "payment.tip_completed",
    entityType: "creator_tip",
    entityId: fulfillment.tipId,
    metadata: {
      checkoutSessionId: session.id,
      creatorId: fulfillment.creatorId,
      amountCents: fulfillment.amountCents,
      paymentRef,
    },
  });
}

async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const stripeSubscriptionId = resolveExpandableId(session.subscription);

  if (session.mode === "subscription" || stripeSubscriptionId) {
    if (!stripeSubscriptionId) {
      throw new Error("Missing Stripe subscription id in checkout.session.completed");
    }

    await syncSubscriptionState({
      stripeSubscriptionId,
      stripeCustomerId: resolveExpandableId(session.customer),
      stripeStatus: "active",
      metadata: session.metadata ?? null,
      tier: readMetadataValue(session.metadata, "tier"),
      canceledAt: null,
    });

    await writeAuditLog({
      actorUserId: readMetadataValue(session.metadata, "subscriberId"),
      action: "subscription.checkout_completed",
      entityType: "subscription",
      entityId: stripeSubscriptionId,
      metadata: {
        checkoutSessionId: session.id,
      },
    });

    return;
  }

  const orderId = session.metadata?.orderId;
  const flow = readMetadataValue(session.metadata ?? null, "flow");

  if (!orderId) {
    if (flow === "tip") {
      await handleTipCheckoutSessionCompleted(session);
      return;
    }

    if (flow === "checkout") {
      await handleMarketplaceCheckoutSessionCompleted(session);
      return;
    }

    await writeAuditLog({
      action: "payment.checkout_completed_without_order",
      entityType: "checkout_session",
      entityId: session.id,
      metadata: {
        metadataKeys: session.metadata ? Object.keys(session.metadata).sort() : [],
      },
    });
    return;
  }

  const order = await db
    .prepare(
      `
        SELECT id, creator_id, subscriber_id, product_id, status, amount_cents, checkout_session_id, payment_intent_id
        FROM dm_orders
        WHERE id = ?
      `
    )
    .get(orderId) as DmOrderRow | undefined;

  if (!order) {
    throw new Error(`Order not found for webhook: ${orderId}`);
  }

  if (order.status === "paid" || order.status === "completed") {
    return;
  }

  let outOfStock = false;
  const paymentRef = readPaymentRefFromCheckoutSession(session);

  await db.transaction(async () => {
    const alreadySale = await db
      .prepare("SELECT id FROM sales WHERE order_id = ?")
      .get(order.id) as { id: string } | undefined;

    if (!alreadySale) {
      const stockResult = await db.prepare(
        `
          UPDATE products
          SET stock = stock - 1,
              sold = sold + 1,
              updated_at = ?
          WHERE id = ?
            AND is_active = 1
            AND stock > 0
        `
      ).run(nowIso(), order.product_id);

      if (stockResult.changes === 0) {
        outOfStock = true;

        await db.prepare(
          `
            UPDATE dm_orders
            SET status = 'failed',
                checkout_session_id = ?,
                payment_intent_id = ?,
                updated_at = ?
            WHERE id = ?
          `
        ).run(session.id, paymentRef, nowIso(), order.id);

        return;
      }

      await db.prepare(
        `
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
          VALUES (?, ?, ?, ?, ?, ?, 'dm', 'stripe', ?, ?)
        `
      ).run(
        createId("sale"),
        order.creator_id,
        order.subscriber_id,
        order.product_id,
        order.id,
        order.amount_cents,
        paymentRef,
        nowIso()
      );
    }

    await db.prepare(
      `
        UPDATE dm_orders
        SET status = 'paid',
            checkout_session_id = ?,
            payment_intent_id = ?,
            updated_at = ?
        WHERE id = ?
      `
    ).run(session.id, paymentRef, nowIso(), order.id);
  });

  if (outOfStock) {
    const refunded = await tryAutoRefundPaymentIntent(
      resolveExpandableId(session.payment_intent),
      "dm_out_of_stock"
    );

    await enqueueNotification({
      userId: order.creator_id,
      type: "system",
      title: "DM siparisi iade surecine alindi",
      message: "Stok tukenmesi nedeniyle odeme otomatik iade surecine alindi.",
      link: "/dashboard",
      channels: ["in_app", "email"],
    });

    await enqueueNotification({
      userId: order.subscriber_id,
      type: "system",
      title: "Odeme iade surecine alindi",
      message: "Stok tukenmesi nedeniyle odemeniz otomatik iade surecine alindi.",
      link: "/dashboard",
      channels: ["in_app", "email"],
    });

    await writeAuditLog({
      actorUserId: order.subscriber_id,
      action: "payment.dm_refund_triggered",
      entityType: "dm_order",
      entityId: order.id,
      metadata: {
        reason: "out_of_stock",
        refunded,
        checkoutSessionId: session.id,
      },
    });

    return;
  }

  const product = await db
    .prepare("SELECT name FROM products WHERE id = ?")
    .get(order.product_id) as { name: string } | undefined;

  await enqueueNotification({
    userId: order.creator_id,
    type: "sale",
    title: "DM odemesi alindi",
    message: `${product?.name ?? "Urun"} siparisi odendi.`,
    link: "/dashboard",
    channels: ["in_app", "email", "push"],
  });

  await enqueueNotification({
    userId: order.subscriber_id,
    type: "dm",
    title: "Odemeniz onaylandi",
    message: `${product?.name ?? "Urun"} siparisiniz odeme onayindan gecti.`,
    link: "/dashboard",
    channels: ["in_app", "email"],
  });

  await writeAuditLog({
    actorUserId: order.subscriber_id,
    action: "payment.completed",
    entityType: "dm_order",
    entityId: order.id,
    metadata: {
      checkoutSessionId: session.id,
      paymentIntentId: resolveExpandableId(session.payment_intent),
    },
  });
}

async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const stripeSubscriptionId = readInvoiceSubscriptionId(invoice);

  if (!stripeSubscriptionId) {
    return;
  }

  await syncSubscriptionState({
    stripeSubscriptionId,
    stripeCustomerId: resolveExpandableId(invoice.customer),
    stripeStatus: "active",
    metadata: readInvoiceMetadata(invoice),
    currentPeriodEnd: unixToIso(invoice.lines?.data?.[0]?.period?.end),
    canceledAt: null,
  });
}

async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const stripeSubscriptionId = readInvoiceSubscriptionId(invoice);

  if (!stripeSubscriptionId) {
    return;
  }

  await syncSubscriptionState({
    stripeSubscriptionId,
    stripeCustomerId: resolveExpandableId(invoice.customer),
    stripeStatus: "past_due",
    metadata: readInvoiceMetadata(invoice),
    currentPeriodEnd: unixToIso(invoice.lines?.data?.[0]?.period?.end),
    canceledAt: null,
  });
}

async function handleCustomerSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  await syncSubscriptionState({
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: resolveExpandableId(subscription.customer),
    stripeStatus: subscription.status,
    metadata: subscription.metadata ?? null,
    tier: readMetadataValue(subscription.metadata, "tier"),
    currentPeriodEnd: readSubscriptionCurrentPeriodEnd(subscription),
    canceledAt: unixToIso(subscription.canceled_at),
  });
}

async function handleCustomerSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  await syncSubscriptionState({
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: resolveExpandableId(subscription.customer),
    stripeStatus: "canceled",
    metadata: subscription.metadata ?? null,
    tier: readMetadataValue(subscription.metadata, "tier"),
    currentPeriodEnd: readSubscriptionCurrentPeriodEnd(subscription),
    canceledAt: unixToIso(subscription.canceled_at) ?? nowIso(),
  });
}

async function handlePaymentFailure(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  const order = await db
    .prepare(
      "SELECT id, creator_id, subscriber_id FROM dm_orders WHERE payment_intent_id = ? OR checkout_session_id = ?"
    )
    .get(paymentIntent.id, paymentIntent.metadata.orderId ?? "") as
    | { id: string; creator_id: string; subscriber_id: string }
    | undefined;

  if (order) {
    await db.prepare("UPDATE dm_orders SET status = 'failed', updated_at = ? WHERE id = ?").run(
      nowIso(),
      order.id
    );

    await enqueueNotification({
      userId: order.creator_id,
      type: "system",
      title: "Odeme basarisiz",
      message: `DM siparisi (${order.id}) odeme hatasi aldi.`,
      link: "/dashboard",
      channels: ["in_app", "email"],
    });

    await enqueueNotification({
      userId: order.subscriber_id,
      type: "system",
      title: "Odeme basarisiz",
      message: "Odemeniz tamamlanamadi, kart bilgilerinizi kontrol edip tekrar deneyin.",
      link: "/dashboard",
      channels: ["in_app", "email"],
    });

    await writeAuditLog({
      actorUserId: order.subscriber_id,
      action: "payment.failed",
      entityType: "dm_order",
      entityId: order.id,
      metadata: {
        paymentIntentId: paymentIntent.id,
        reason: paymentIntent.last_payment_error?.code ?? null,
      },
    });

    return;
  }

  const tip = await db
    .prepare(
      `
        SELECT id, creator_id, tipper_id
        FROM creator_tips
        WHERE payment_intent_id = ?
          OR payment_ref = ?
      `
    )
    .get(paymentIntent.id, paymentIntent.id) as
    | { id: string; creator_id: string; tipper_id: string }
    | undefined;

  if (!tip) {
    return;
  }

  await db
    .prepare("UPDATE creator_tips SET status = 'failed', updated_at = ? WHERE id = ?")
    .run(nowIso(), tip.id);

  await enqueueNotification({
    userId: tip.creator_id,
    type: "system",
    title: "Bahsis odemesi basarisiz",
    message: `Bahsis islemi (${tip.id}) odeme hatasi aldi.`,
    link: "/dashboard",
    channels: ["in_app", "email"],
  });

  await enqueueNotification({
    userId: tip.tipper_id,
    type: "system",
    title: "Bahsis odemesi basarisiz",
    message: "Bahsis odemeniz tamamlanamadi, kart bilgilerinizi kontrol edip tekrar deneyin.",
    link: "/creators",
    channels: ["in_app", "email"],
  });

  await writeAuditLog({
    actorUserId: tip.tipper_id,
    action: "payment.tip_failed",
    entityType: "creator_tip",
    entityId: tip.id,
    metadata: {
      paymentIntentId: paymentIntent.id,
      reason: paymentIntent.last_payment_error?.code ?? null,
    },
  });
}

async function handleRefund(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;

  if (!paymentIntentId) {
    return;
  }

  const order = await db
    .prepare(
      "SELECT id, creator_id, subscriber_id, product_id FROM dm_orders WHERE payment_intent_id = ?"
    )
    .get(paymentIntentId) as
    | { id: string; creator_id: string; subscriber_id: string; product_id: string }
    | undefined;

  if (order) {
    await db.prepare("UPDATE dm_orders SET status = 'refunded', updated_at = ? WHERE id = ?").run(
      nowIso(),
      order.id
    );

    await db.prepare(
      `
        UPDATE products
        SET stock = stock + 1,
            sold = CASE WHEN sold > 0 THEN sold - 1 ELSE 0 END,
            updated_at = ?
        WHERE id = ?
      `
    ).run(nowIso(), order.product_id);

    await enqueueNotification({
      userId: order.creator_id,
      type: "system",
      title: "Iade tamamlandi",
      message: `DM siparisi (${order.id}) iade edildi.`,
      link: "/dashboard",
      channels: ["in_app", "email"],
    });

    await enqueueNotification({
      userId: order.subscriber_id,
      type: "system",
      title: "Iadeniz tamamlandi",
      message: `Siparisiniz (${order.id}) icin iade gerceklesti.`,
      link: "/dashboard",
      channels: ["in_app", "email"],
    });

    await writeAuditLog({
      actorUserId: order.subscriber_id,
      action: "payment.refunded",
      entityType: "dm_order",
      entityId: order.id,
      metadata: {
        paymentIntentId,
        chargeId: charge.id,
      },
    });

    return;
  }

  const tip = await db
    .prepare(
      `
        SELECT id, creator_id, tipper_id, amount_cents, status
        FROM creator_tips
        WHERE payment_ref = ?
           OR payment_intent_id = ?
      `
    )
    .get(paymentIntentId, paymentIntentId) as
    | {
        id: string;
        creator_id: string;
        tipper_id: string;
        amount_cents: number;
        status: CreatorTipStatus;
      }
    | undefined;

  if (tip) {
    if (tip.status !== "refunded") {
      await db
        .prepare("UPDATE creator_tips SET status = 'refunded', updated_at = ? WHERE id = ?")
        .run(nowIso(), tip.id);

      const amountLabel = formatCurrencyFromCents(tip.amount_cents);

      await enqueueNotification({
        userId: tip.creator_id,
        type: "system",
        title: "Bahsis iadesi tamamlandi",
        message: `${amountLabel} tutarindaki bahsis iade edildi.`,
        link: "/dashboard",
        channels: ["in_app", "email"],
      });

      await enqueueNotification({
        userId: tip.tipper_id,
        type: "system",
        title: "Bahsis iadeniz tamamlandi",
        message: `${amountLabel} tutarindaki bahsisiniz icin iade gerceklesti.`,
        link: "/dashboard",
        channels: ["in_app", "email"],
      });

      await writeAuditLog({
        actorUserId: tip.tipper_id,
        action: "payment.tip_refunded",
        entityType: "creator_tip",
        entityId: tip.id,
        metadata: {
          paymentIntentId,
          chargeId: charge.id,
          amountCents: tip.amount_cents,
        },
      });
    }

    return;
  }

  const sale = await db
    .prepare(
      `
        SELECT id, creator_id, buyer_id, product_id
        FROM sales
        WHERE payment_ref = ?
          AND source = 'checkout'
      `
    )
    .get(paymentIntentId) as
    | { id: string; creator_id: string; buyer_id: string; product_id: string }
    | undefined;

  if (!sale) {
    return;
  }

  await db.prepare(
    `
      UPDATE products
      SET stock = stock + 1,
          sold = CASE WHEN sold > 0 THEN sold - 1 ELSE 0 END,
          updated_at = ?
      WHERE id = ?
    `
  ).run(nowIso(), sale.product_id);

  await enqueueNotification({
    userId: sale.creator_id,
    type: "system",
    title: "Satis iadesi tamamlandi",
    message: `Checkout satisi (${sale.id}) iade edildi.`,
    link: "/dashboard",
    channels: ["in_app", "email"],
  });

  await enqueueNotification({
    userId: sale.buyer_id,
    type: "system",
    title: "Iadeniz tamamlandi",
    message: `Satin alma isleminiz (${sale.id}) icin iade gerceklesti.`,
    link: "/dashboard",
    channels: ["in_app", "email"],
  });

  await writeAuditLog({
    actorUserId: sale.buyer_id,
    action: "payment.refunded",
    entityType: "sale",
    entityId: sale.id,
    metadata: {
      paymentIntentId,
      chargeId: charge.id,
      source: "checkout",
    },
  });
}

async function dispatchStripeEvent(event: Stripe.Event): Promise<void> {
  if (event.type === "checkout.session.completed") {
    await handleCheckoutSessionCompleted(event);
    return;
  }

  if (event.type === "invoice.paid") {
    await handleInvoicePaid(event);
    return;
  }

  if (event.type === "invoice.payment_failed") {
    await handleInvoicePaymentFailed(event);
    return;
  }

  if (event.type === "customer.subscription.updated") {
    await handleCustomerSubscriptionUpdated(event);
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    await handleCustomerSubscriptionDeleted(event);
    return;
  }

  if (event.type === "payment_intent.payment_failed") {
    await handlePaymentFailure(event);
    return;
  }

  if (event.type === "charge.refunded") {
    await handleRefund(event);
    return;
  }

  logInfo("stripe.webhook.ignored", {
    provider: "stripe",
    eventId: event.id,
    eventType: event.type,
  });
}

export async function processStripeWebhook(params: {
  rawBody: string;
  signature: string;
}): Promise<{ duplicate: boolean }> {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      params.rawBody,
      params.signature,
      webhookSecret
    );
  } catch (error) {
    logWarn("stripe.webhook.signature_verification_failed", {
      provider: "stripe",
      error: sanitizeWebhookError(error),
    });
    throw new StripeWebhookSignatureError();
  }

  const eventState = await registerWebhookEvent({
    provider: "stripe",
    eventId: event.id,
    eventType: event.type,
    payloadJson: params.rawBody,
  });

  if (eventState.duplicate) {
    logInfo("stripe.webhook.duplicate", {
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
    });
    return { duplicate: true };
  }

  try {
    await dispatchStripeEvent(event);
    await markWebhookProcessed(eventState.eventRowId);

    logInfo("stripe.webhook.processed", {
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
    });
  } catch (error) {
    await markWebhookFailed(eventState.eventRowId, error);

    logError("stripe.webhook.processing_failed", {
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
      error: sanitizeWebhookError(error),
    });

    throw new Error("Webhook processing failed");
  }

  return { duplicate: false };
}

export async function retryFailedStripeWebhooks(limit = 10): Promise<number> {
  const rows = await db
    .prepare(
      `
        SELECT id, event_id, event_type, payload_json
        FROM webhook_events
        WHERE provider = 'stripe'
          AND status = 'failed'
          AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
        ORDER BY created_at ASC
        LIMIT ?
      `
    )
    .all(nowIso(), limit) as Array<{
      id: string;
      event_id: string;
      event_type: string;
      payload_json: string;
    }>;

  let processed = 0;

  for (const row of rows) {
    try {
      const event = JSON.parse(row.payload_json) as Stripe.Event;
      await dispatchStripeEvent(event);
      await markWebhookProcessed(row.id);
      processed += 1;

      logInfo("stripe.webhook.retry_processed", {
        provider: "stripe",
        eventId: row.event_id,
        eventType: row.event_type,
      });
    } catch (error) {
      await markWebhookFailed(row.id, error);

      logError("stripe.webhook.retry_failed", {
        provider: "stripe",
        eventId: row.event_id,
        eventType: row.event_type,
        error: sanitizeWebhookError(error),
      });
    }
  }

  return processed;
}
