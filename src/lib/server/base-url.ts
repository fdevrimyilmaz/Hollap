export function resolvePublicBaseUrl(): string {
  const raw = process.env.APP_BASE_URL?.trim();
  if (raw) {
    try {
      const url = new URL(raw);
      return url.origin;
    } catch {
      // fall through
    }
  }
  return "http://localhost:3000";
}
