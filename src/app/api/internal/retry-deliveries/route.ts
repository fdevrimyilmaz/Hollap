import { NextResponse } from "next/server";
import { cleanupExpiredPendingUploads } from "@/lib/server/files";
import { processDeliveryQueue } from "@/lib/server/notifications";
import { retryFailedStripeWebhooks } from "@/lib/server/payments";
import { expireOverdueSubscriptions } from "@/lib/server/subscriptions";

function isAuthorized(request: Request): boolean {
  const configuredKey = process.env.INTERNAL_CRON_KEY;

  if (!configuredKey) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("x-internal-key") === configuredKey;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [deliveries, orphanUploads, expiredSubscriptions] = await Promise.all([
    processDeliveryQueue(50),
    cleanupExpiredPendingUploads(100),
    expireOverdueSubscriptions(),
  ]);
  const retriedWebhooks = await retryFailedStripeWebhooks(20);

  return NextResponse.json({
    ok: true,
    deliveries,
    retriedWebhooks,
    orphanUploads,
    expiredSubscriptions,
  });
}
