import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { enqueueNotification } from "@/lib/server/notifications";
import { createCheckoutSession, isStripeConfigured } from "@/lib/server/payments";
import { assertCsrf } from "@/lib/server/security";
import { isSubscriptionActive } from "@/lib/server/subscriptions";
import { parseJsonBody } from "@/lib/server/validation";

const subscribeSchema = z.object({
  tier: z.enum(["free", "supporter", "vip"]).default("free"),
  successPath: z.string().trim().optional(),
  cancelPath: z.string().trim().optional(),
});

type Params = { params: Promise<{ id: string }> };

const TIER_PRICE_CENTS: Record<"free" | "supporter" | "vip", number> = {
  free: 0,
  supporter: Number(process.env.SUB_TIER_SUPPORTER_CENTS ?? 500),
  vip: Number(process.env.SUB_TIER_VIP_CENTS ?? 2000),
};

function normalizePath(path: string | undefined, fallback: string): string {
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}

export async function GET(request: Request, context: Params) {
  try {
    const user = await requireAuth(request);
    const { id: creatorId } = await context.params;

    const row = (await db
      .prepare(
        `SELECT id, tier, active, stripe_status, current_period_end, created_at
         FROM subscriptions
         WHERE creator_id = ? AND subscriber_id = ?`,
      )
      .get(creatorId, user.id)) as
      | {
          id: string;
          tier: string;
          active: number;
          stripe_status: string | null;
          current_period_end: string | null;
          created_at: string;
        }
      | undefined;

    if (!row) {
      return NextResponse.json({ subscribed: false });
    }

    return NextResponse.json({
      subscribed: isSubscriptionActive(row),
      tier: row.tier,
      status: row.stripe_status,
      periodEnd: row.current_period_end,
      since: row.created_at,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);
    const { id: creatorId } = await context.params;
    const body = await parseJsonBody(request, subscribeSchema);

    if (creatorId === user.id) {
      return NextResponse.json({ error: "Kendi profiline abone olamazsın" }, { status: 400 });
    }

    const creator = (await db
      .prepare("SELECT id, name FROM users WHERE id = ? AND role = 'creator'")
      .get(creatorId)) as { id: string; name: string } | undefined;

    if (!creator) {
      return NextResponse.json({ error: "Yaratıcı bulunamadı" }, { status: 404 });
    }

    const ts = nowIso();
    const isPaidTier = body.tier !== "free";
    const priceCents = TIER_PRICE_CENTS[body.tier];

    if (isPaidTier && !isStripeConfigured()) {
      return NextResponse.json(
        {
          error:
            "Ücretli abonelikler şu an devre dışı. Stripe yapılandırılana kadar yalnızca ücretsiz abonelik mümkün.",
        },
        { status: 503 },
      );
    }

    // Idempotent upsert of pending/active subscription row.
    const existing = (await db
      .prepare("SELECT id, active, stripe_status FROM subscriptions WHERE creator_id = ? AND subscriber_id = ?")
      .get(creatorId, user.id)) as
      | { id: string; active: number; stripe_status: string | null }
      | undefined;

    if (isPaidTier) {
      // Paid tier: open a Stripe Checkout Session, mark subscription as pending until webhook confirms.
      const subscriptionId = existing?.id ?? `sub_${randomUUID()}`;

      if (existing) {
        await db
          .prepare(
            `UPDATE subscriptions
             SET tier = ?, stripe_status = 'pending', updated_at = ?
             WHERE id = ?`,
          )
          .run(body.tier, ts, existing.id);
      } else {
        await db
          .prepare(
            `INSERT INTO subscriptions (id, creator_id, subscriber_id, tier, active, stripe_status, created_at, updated_at)
             VALUES (?, ?, ?, ?, 0, 'pending', ?, ?)`,
          )
          .run(subscriptionId, creatorId, user.id, body.tier, ts, ts);
      }

      const origin = new URL(request.url).origin;
      const successPath = normalizePath(body.successPath, `/creator/${creatorId}?sub=success`);
      const cancelPath = normalizePath(body.cancelPath, `/creator/${creatorId}?sub=cancelled`);

      const checkout = await createCheckoutSession({
        customerEmail: user.email,
        productName: `${creator.name} — ${body.tier === "supporter" ? "Destekçi" : "VIP"} aboneliği (30 gün)`,
        amountCents: priceCents,
        successUrl: `${origin}${successPath}`,
        cancelUrl: `${origin}${cancelPath}`,
        metadata: {
          flow: "subscription",
          subscriptionId,
          creatorId,
          subscriberId: user.id,
          tier: body.tier,
          periodDays: "30",
        },
      });

      return NextResponse.json({
        subscribed: false,
        pending: true,
        checkoutUrl: checkout.url,
        checkoutSessionId: checkout.id,
        tier: body.tier,
      });
    }

    // Free tier: activate immediately.
    if (existing) {
      await db
        .prepare(
          `UPDATE subscriptions
           SET tier = 'free', active = 1, stripe_status = 'active', updated_at = ?
           WHERE id = ?`,
        )
        .run(ts, existing.id);
    } else {
      await db
        .prepare(
          `INSERT INTO subscriptions (id, creator_id, subscriber_id, tier, active, stripe_status, created_at, updated_at)
           VALUES (?, ?, ?, 'free', 1, 'active', ?, ?)`,
        )
        .run(`sub_${randomUUID()}`, creatorId, user.id, ts, ts);

      await enqueueNotification({
        userId: creatorId,
        type: "subscriber",
        title: "Yeni abone",
        message: `${user.name} sana abone oldu (ücretsiz).`,
        link: "/dashboard/subscribers",
        channels: ["in_app", "push"],
      });
    }

    return NextResponse.json({ subscribed: true, tier: "free" });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);
    const { id: creatorId } = await context.params;
    const ts = nowIso();

    const existing = (await db
      .prepare(
        `SELECT id, current_period_end FROM subscriptions
         WHERE creator_id = ? AND subscriber_id = ?`,
      )
      .get(creatorId, user.id)) as
      | { id: string; current_period_end: string | null }
      | undefined;

    if (!existing) {
      return NextResponse.json({ subscribed: false });
    }

    const periodEnd = existing.current_period_end
      ? new Date(existing.current_period_end).getTime()
      : null;

    // Paid subscription still within paid period: keep active=1 but mark canceled
    // so renewals don't happen. The expiration cron will flip active to 0 once
    // current_period_end passes.
    if (periodEnd && periodEnd > Date.now()) {
      await db
        .prepare(
          `UPDATE subscriptions
           SET stripe_status = 'canceled', canceled_at = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(ts, ts, existing.id);

      return NextResponse.json({
        subscribed: true,
        canceled: true,
        accessUntil: existing.current_period_end,
        message: "Aboneliğin iptal edildi. Dönem sonuna kadar erişimin sürer.",
      });
    }

    // Free subscription (no period) or already expired: revoke immediately.
    await db
      .prepare(
        `UPDATE subscriptions
         SET active = 0, stripe_status = 'canceled', canceled_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(ts, ts, existing.id);

    return NextResponse.json({ subscribed: false, canceled: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
