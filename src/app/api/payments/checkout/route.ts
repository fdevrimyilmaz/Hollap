import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { db } from "@/lib/server/db";
import { createCheckoutSession, isStripeConfigured } from "@/lib/server/payments";
import {
  assertCsrf,
  hashValue,
  readIdempotencyKey,
  reserveIdempotencyKey,
  storeIdempotencyResponse,
} from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const checkoutSchema = z.object({
  productId: z.string().trim().min(1),
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
    const body = await parseJsonBody(request, checkoutSchema);
    const idempotencyKey = readIdempotencyKey(request);

    const requestHash = hashValue(`${user.id}:${body.productId}:${body.successPath ?? ""}:${body.cancelPath ?? ""}`);
    const idemState = await reserveIdempotencyKey({
      scope: `checkout:${user.id}`,
      idempotencyKey,
      requestHash,
      ttlSeconds: 24 * 60 * 60,
    });

    if (idemState.replay) {
      return NextResponse.json(idemState.replay.body, {
        status: idemState.replay.statusCode,
      });
    }

    const product = await db
      .prepare(
        `
          SELECT id, creator_id, name, price_cents, stock, is_active
          FROM products
          WHERE id = ?
        `
      )
      .get(body.productId) as
      | {
          id: string;
          creator_id: string;
          name: string;
          price_cents: number;
          stock: number;
          is_active: number;
        }
      | undefined;

    if (!product || !product.is_active || product.stock <= 0) {
      return NextResponse.json({ error: "Product not available" }, { status: 404 });
    }

    const origin = new URL(request.url).origin;
    const successPath = normalizePath(body.successPath, "/checkout?status=success");
    const cancelPath = normalizePath(body.cancelPath, "/checkout?status=cancelled");

    const checkout = await createCheckoutSession({
      customerEmail: user.email,
      productName: product.name,
      amountCents: product.price_cents,
      successUrl: `${origin}${successPath}`,
      cancelUrl: `${origin}${cancelPath}`,
      idempotencyKey,
      metadata: {
        flow: "checkout",
        userId: user.id,
        productId: product.id,
        creatorId: product.creator_id,
      },
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "payment.checkout_created",
      entityType: "checkout_session",
      entityId: checkout.id,
      metadata: {
        productId: product.id,
        amountCents: product.price_cents,
      },
    });

    const responseBody = {
      checkoutUrl: checkout.url,
      checkoutSessionId: checkout.id,
      product: {
        id: product.id,
        name: product.name,
        amountCents: product.price_cents,
      },
    };

    await storeIdempotencyResponse({
      scope: `checkout:${user.id}`,
      idempotencyKey,
      statusCode: 200,
      body: responseBody,
    });

    return NextResponse.json(responseBody);
  } catch (error) {
    return authErrorResponse(error);
  }
}
