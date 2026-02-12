import { NextResponse } from "next/server";
import {
  processStripeWebhook,
  StripeWebhookSignatureError,
} from "@/lib/server/payments";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  try {
    const rawBody = await request.text();
    const result = await processStripeWebhook({
      rawBody,
      signature,
    });

    return NextResponse.json({ ok: true, duplicate: result.duplicate });
  } catch (error) {
    if (error instanceof StripeWebhookSignatureError) {
      return NextResponse.json(
        { error: "Invalid stripe-signature header" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
