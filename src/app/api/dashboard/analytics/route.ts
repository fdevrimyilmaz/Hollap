import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

const CREATOR_SHARE = 0.8;

type DailyRow = {
  day: string;
  sales_count: number;
  gross_cents: number;
};

type ProductPerformanceRow = {
  product_id: string;
  product_name: string;
  sales_count: number;
  gross_cents: number;
};

type StatusRow = {
  status: string;
  count: number;
};

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request, { role: "creator" });
    const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Daily sales for last 30 days
    const dailyRowsRaw = (await db
      .prepare(
        `SELECT
            substr(created_at, 1, 10) AS day,
            COUNT(*)::int            AS sales_count,
            COALESCE(SUM(amount_cents), 0)::int AS gross_cents
         FROM sales
         WHERE creator_id = ? AND created_at >= ?
         GROUP BY substr(created_at, 1, 10)
         ORDER BY day ASC`,
      )
      .all(user.id, sinceDate)) as DailyRow[];

    // Fill missing days with zeros for stable chart x-axis
    const dailyMap = new Map(dailyRowsRaw.map((row) => [dateOnly(row.day), row]));
    const dailySeries: Array<{ day: string; sales: number; grossCents: number; netCents: number }> = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const row = dailyMap.get(key);
      const gross = row?.gross_cents ?? 0;
      dailySeries.push({
        day: key,
        sales: row?.sales_count ?? 0,
        grossCents: gross,
        netCents: Math.round(gross * CREATOR_SHARE),
      });
    }

    // Top performing products
    const products = (await db
      .prepare(
        `SELECT s.product_id, p.name AS product_name,
                COUNT(*)::int AS sales_count,
                COALESCE(SUM(s.amount_cents), 0)::int AS gross_cents
         FROM sales s
         JOIN products p ON p.id = s.product_id
         WHERE s.creator_id = ?
         GROUP BY s.product_id, p.name
         ORDER BY gross_cents DESC
         LIMIT 5`,
      )
      .all(user.id)) as ProductPerformanceRow[];

    // Subscription mix (by tier)
    const subscriptionMix = (await db
      .prepare(
        `SELECT tier AS status, COUNT(*)::int AS count
         FROM subscriptions
         WHERE creator_id = ?
           AND (active = 1 OR LOWER(stripe_status) IN ('active', 'trialing'))
         GROUP BY tier`,
      )
      .all(user.id)) as StatusRow[];

    // 30-day totals
    const totals = (await db
      .prepare(
        `SELECT
            COUNT(*)::int AS sales_count,
            COALESCE(SUM(amount_cents), 0)::int AS gross_cents
         FROM sales
         WHERE creator_id = ? AND created_at >= ?`,
      )
      .get(user.id, sinceDate)) as { sales_count: number; gross_cents: number };

    const newSubscribers = (await db
      .prepare(
        `SELECT COUNT(*)::int AS count
         FROM subscriptions
         WHERE creator_id = ? AND created_at >= ?`,
      )
      .get(user.id, sinceDate)) as { count: number };

    return NextResponse.json({
      windowDays: 30,
      summary: {
        salesCount: totals.sales_count,
        grossCents: totals.gross_cents,
        netCents: Math.round(totals.gross_cents * CREATOR_SHARE),
        commissionCents: Math.round(totals.gross_cents * (1 - CREATOR_SHARE)),
        newSubscribers: newSubscribers.count,
      },
      dailySales: dailySeries,
      topProducts: products.map((p) => ({
        productId: p.product_id,
        productName: p.product_name,
        salesCount: p.sales_count,
        grossCents: p.gross_cents,
        netCents: Math.round(p.gross_cents * CREATOR_SHARE),
      })),
      subscriptionMix: subscriptionMix.map((row) => ({
        tier: row.status,
        count: row.count,
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
