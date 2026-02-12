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
