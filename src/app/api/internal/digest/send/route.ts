import { NextResponse } from "next/server";
import {
  buildWeeklyDigestStats,
  listActiveCreators,
  sendDigestEmail,
} from "@/lib/server/digest";

function isAuthorized(request: Request): boolean {
  const expected = process.env.INTERNAL_CRON_KEY?.trim();
  if (!expected) return true; // dev: open
  const header = request.headers.get("authorization");
  if (header === `Bearer ${expected}`) return true;
  const queryKey = new URL(request.url).searchParams.get("key");
  return queryKey === expected;
}

async function runDigest(request: Request) {
  const origin = new URL(request.url).origin;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const creators = await listActiveCreators();

  const results: Array<{ creatorId: string; sent: boolean; mode: string }> = [];

  for (const creator of creators) {
    const stats = await buildWeeklyDigestStats(creator.id, since);
    // Skip creators with zero activity.
    if (stats.salesCount === 0 && stats.newSubscribers === 0 && stats.newReviews === 0) {
      results.push({ creatorId: creator.id, sent: false, mode: "skipped" });
      continue;
    }
    const sendResult = await sendDigestEmail({
      to: creator.email,
      creatorName: creator.name,
      stats,
      baseUrl: origin,
    });
    results.push({ creatorId: creator.id, sent: sendResult.sent, mode: sendResult.mode });
  }

  return NextResponse.json({
    creatorsProcessed: creators.length,
    sent: results.filter((r) => r.sent).length,
    skipped: results.filter((r) => r.mode === "skipped").length,
    devConsole: results.filter((r) => r.mode === "console").length,
  });
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return runDigest(request);
}

export async function GET(request: Request) {
  // Allow GET in dev (no INTERNAL_CRON_KEY) for manual triggering from the browser.
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return runDigest(request);
}
