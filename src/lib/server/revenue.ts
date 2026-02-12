export const PLATFORM_COMMISSION_RATE = 0.2;
export const PLATFORM_COMMISSION_PERCENT = 20;
export const CREATOR_REVENUE_SHARE_RATE = 1 - PLATFORM_COMMISSION_RATE;
export const CREATOR_REVENUE_SHARE_PERCENT = 80;

export function calculatePlatformCommissionCents(grossCents: number): number {
  if (!Number.isFinite(grossCents) || grossCents <= 0) {
    return 0;
  }

  return Math.round(grossCents * PLATFORM_COMMISSION_RATE);
}

export function calculateCreatorNetCents(grossCents: number): number {
  if (!Number.isFinite(grossCents) || grossCents <= 0) {
    return 0;
  }

  return grossCents - calculatePlatformCommissionCents(grossCents);
}
