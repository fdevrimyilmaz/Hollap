import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

type SubscriberRow = {
  id: string;
  tier: string;
  active: number;
  stripe_status: string | null;
  current_period_end: string | null;
  created_at: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
};

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request, { role: "creator" });
    const nowTs = new Date().toISOString();

    const rows = (await db
      .prepare(
        `SELECT s.id, s.tier, s.active, s.stripe_status, s.current_period_end, s.created_at,
                u.id AS user_id, u.name AS user_name, u.email AS user_email, u.avatar_url AS user_avatar
         FROM subscriptions s
         JOIN users u ON u.id = s.subscriber_id
         WHERE s.creator_id = ?
         ORDER BY s.created_at DESC
         LIMIT 500`,
      )
      .all(user.id)) as SubscriberRow[];

    const isActive = (row: SubscriberRow): boolean => {
      if (row.active !== 1) return false;
      const status = (row.stripe_status ?? "").toLowerCase();
      if (!["active", "trialing"].includes(status)) return false;
      if (row.current_period_end && new Date(row.current_period_end).getTime() < Date.now()) {
        return false;
      }
      return true;
    };

    const subscribers = rows.map((row) => ({
      id: row.id,
      tier: row.tier,
      status: row.stripe_status,
      active: isActive(row),
      since: row.created_at,
      periodEnd: row.current_period_end,
      subscriber: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        avatarUrl: row.user_avatar,
      },
    }));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const counts = {
      total: subscribers.length,
      active: subscribers.filter((s) => s.active).length,
      vip: subscribers.filter((s) => s.active && s.tier === "vip").length,
      supporter: subscribers.filter((s) => s.active && s.tier === "supporter").length,
      free: subscribers.filter((s) => s.active && s.tier === "free").length,
      newLast30Days: subscribers.filter((s) => s.active && new Date(s.since) >= thirtyDaysAgo)
        .length,
    };

    return NextResponse.json({
      counts,
      subscribers,
      generatedAt: nowTs,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
