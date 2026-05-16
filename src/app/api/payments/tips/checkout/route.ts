import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, HttpError, requireAuth } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { createId, db, nowIso } from "@/lib/server/db";
import { createCheckoutSession, isStripeConfigured } from "@/lib/server/payments";
import {
  assertCsrf,
  hashValue,
  readIdempotencyKey,
  reserveIdempotencyKey,
  storeIdempotencyResponse,
} from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const tipCheckoutSchema = z.object({
  creatorId: z.string().trim().min(1),
  amountCents: z.number().int().min(100).max(1_000_000),
  successPath: z.string().trim().optional(),
  cancelPath: z.string().trim().optional(),
});

function normalizePath(path: string | undefined, fallback: string): string {
  if (!path) {
    return fallback;
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  return path;
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);

    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.",
        },
        { status: 503 }
      );
    }

    const user = await requireAuth(request);
    const body = await parseJsonBody(request, tipCheckoutSchema);

    if (body.creatorId === user.id) {
      throw new HttpError(400, "Kendinize bahsis gonderemezsiniz");
    }

    const creator = await db
      .prepare("SELECT id, name FROM users WHERE id = ? AND role = 'creator'")
      .get(body.creatorId) as { id: string; name: string } | undefined;

    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const idempotencyKey = readIdempotencyKey(request);
    const requestHash = hashValue(
      `${user.id}:${body.creatorId}:${body.amountCents}:${body.successPath ?? ""}:${body.cancelPath ?? ""}`
    );

    const idemState = await reserveIdempotencyKey({
      scope: `tip_checkout:${user.id}`,
      idempotencyKey,
      requestHash,
      ttlSeconds: 24 * 60 * 60,
    });

    if (idemState.replay) {
      return NextResponse.json(idemState.replay.body, {
        status: idemState.replay.statusCode,
      });
    }

    const origin = new URL(request.url).origin;
    const successPath = normalizePath(body.successPath, "/creators?tip=success");
    const cancelPath = normalizePath(body.cancelPath, "/creators?tip=cancelled");
    const tipId = createId("tip");

    const checkout = await createCheckoutSession({
      customerEmail: user.email,
      productName: `${creator.name} icin bahsis`,
      amountCents: body.amountCents,
      successUrl: `${origin}${successPath}`,
      cancelUrl: `${origin}${cancelPath}`,
      idempotencyKey,
      metadata: {
        flow: "tip",
        tipId,
        creatorId: creator.id,
        tipperId: user.id,
        amountCents: String(body.amountCents),
      },
    });

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
        VALUES (?, ?, ?, ?, 'pending', ?, NULL, 'stripe', NULL, ?, ?)
      `
    ).run(
      tipId,
      creator.id,
      user.id,
      body.amountCents,
      checkout.id,
      timestamp,
      timestamp
    );

    await writeAuditLog({
      actorUserId: user.id,
      action: "payment.tip_checkout_created",
      entityType: "creator_tip",
      entityId: tipId,
      metadata: {
        creatorId: creator.id,
        amountCents: body.amountCents,
        checkoutSessionId: checkout.id,
      },
    });

    const responseBody = {
      checkoutUrl: checkout.url,
      checkoutSessionId: checkout.id,
      tip: {
        id: tipId,
        creatorId: creator.id,
        creatorName: creator.name,
        amountCents: body.amountCents,
      },
    };

    await storeIdempotencyResponse({
      scope: `tip_checkout:${user.id}`,
      idempotencyKey,
      statusCode: 200,
      body: responseBody,
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    return authErrorResponse(error);
  }
}
