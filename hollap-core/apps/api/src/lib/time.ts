const DURATION_REGEX = /^(\d+)([smhd])$/;

const UNIT_TO_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function durationToMs(duration: string): number {
  const match = duration.match(DURATION_REGEX);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const [, amountRaw, unit] = match;
  const amount = Number(amountRaw);
  return amount * UNIT_TO_MS[unit];
}
