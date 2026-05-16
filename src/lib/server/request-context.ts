import type { NextRequest } from "next/server";

const UNKNOWN = "unknown";

// Headers set by trusted edge platforms. These cannot be spoofed by the client
// because the platform overwrites whatever the client sends. Listed in
// platform-preference order; first match wins.
const TRUSTED_PLATFORM_IP_HEADERS = [
  "x-nf-client-connection-ip",       // Netlify
  "x-vercel-forwarded-for",          // Vercel (single value, edge-injected)
  "cf-connecting-ip",                // Cloudflare
  "fly-client-ip",                   // Fly.io
  "true-client-ip",                  // Akamai, Cloudflare Enterprise
];

function pickFirst(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.split(",")[0]?.trim();
  return trimmed || null;
}

function pickLast(value: string | null): string | null {
  if (!value) return null;
  const parts = value.split(",");
  const trimmed = parts[parts.length - 1]?.trim();
  return trimmed || null;
}

/**
 * Resolve the client IP with platform-trust awareness.
 *
 * Why this is not just `x-forwarded-for[0]`: the leftmost X-F-F entry is the
 * value the upstream client sent. An attacker can send arbitrary IPs there to
 * bypass per-IP rate limits. We prefer platform-injected single-value headers
 * (which the platform overwrites), and fall back to the *last* X-F-F hop
 * (which is the platform's own appended entry).
 */
export function getClientIp(request: Request | NextRequest): string {
  for (const header of TRUSTED_PLATFORM_IP_HEADERS) {
    const value = pickFirst(request.headers.get(header));
    if (value) return value;
  }

  const xRealIp = request.headers.get("x-real-ip")?.trim();
  if (xRealIp) return xRealIp;

  // x-forwarded-for: take the LAST entry, not the first. Last is appended by
  // the trust boundary; earlier entries are caller-controlled.
  const xff = pickLast(request.headers.get("x-forwarded-for"));
  if (xff) return xff;

  return UNKNOWN;
}

export function getUserAgent(request: Request | NextRequest): string {
  return request.headers.get("user-agent")?.slice(0, 255) || UNKNOWN;
}
