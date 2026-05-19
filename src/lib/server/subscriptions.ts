import { db, nowIso } from "@/lib/server/db";

const ACCESS_ACTIVE_STATUSES = ["active", "trialing"] as const;

export function getAccessActiveStatuses(): readonly string[] {
  return ACCESS_ACTIVE_STATUSES;
}

export function subscriptionStatusGrantsAccess(status: string | null | undefined): boolean {
  if (!status) {
    return false;
  }

  const normalized = status.trim().toLowerCase();
  return ACCESS_ACTIVE_STATUSES.includes(normalized as (typeof ACCESS_ACTIVE_STATUSES)[number]);
}

export type SubscriptionAccessRow = {
  active: number;
  stripe_status: string | null;
  current_period_end: string | null;
};

/**
 * True if the subscription currently grants access — checks status AND that the
 * paid period (if any) has not lapsed. Free subscriptions have
 * current_period_end IS NULL and are considered always active until canceled.
 */
export function isSubscriptionActive(row: SubscriptionAccessRow | undefined | null): boolean {
  if (!row) return false;
  if (row.active !== 1) return false;
  if (!subscriptionStatusGrantsAccess(row.stripe_status)) return false;
  if (row.current_period_end) {
    const end = new Date(row.current_period_end).getTime();
    if (!Number.isNaN(end) && end < Date.now()) {
      return false;
    }
  }
  return true;
}

export async function hasActiveSubscription(creatorId: string, subscriberId: string): Promise<boolean> {
  const row = (await db
    .prepare(
      `SELECT active, stripe_status, current_period_end
       FROM subscriptions
       WHERE creator_id = ? AND subscriber_id = ?`,
    )
    .get(creatorId, subscriberId)) as SubscriptionAccessRow | undefined;
  return isSubscriptionActive(row);
}

/**
 * Marks subscriptions whose paid period has ended as inactive. Idempotent.
 * Free subscriptions (current_period_end IS NULL) are not touched here — they
 * remain active until explicitly canceled.
 */
export async function expireOverdueSubscriptions(): Promise<{ expired: number }> {
  const ts = nowIso();
  const result = (await db
    .prepare(
      `UPDATE subscriptions
       SET active = 0,
           stripe_status = 'expired',
           updated_at = ?
       WHERE active = 1
         AND current_period_end IS NOT NULL
         AND current_period_end < ?
       RETURNING id`,
    )
    .all(ts, ts)) as Array<{ id: string }>;

  return { expired: result.length };
}
