import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { createDmOrderPaymentLink, isStripeConfigured } from "@/lib/server/payments";
import { assertCsrf } from "@/lib/server/security";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Params) {
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

    const user = await requireAuth(request, { role: "creator" });
    const { id } = await context.params;
    const origin = new URL(request.url).origin;
    const rawIdempotencyKey = request.headers.get("x-idempotency-key")?.trim();
    const idempotencyKey = rawIdempotencyKey?.match(/^[a-zA-Z0-9._:-]{8,128}$/)
      ? rawIdempotencyKey
      : undefined;

    const paymentLink = await createDmOrderPaymentLink({
      orderId: id,
      actorCreatorId: user.id,
      successUrl: `${origin}/dashboard?dm_payment=success`,
      cancelUrl: `${origin}/dashboard?dm_payment=cancelled`,
      idempotencyKey,
    });

    return NextResponse.json({
      ok: true,
      orderId: id,
      checkoutSessionId: paymentLink.checkoutSessionId,
      paymentUrl: paymentLink.url,
      requestedBy: user.id,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
