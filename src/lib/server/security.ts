import { createHash, timingSafeEqual } from "node:crypto";
import { db, createId, nowIso } from "@/lib/server/db";
import { HttpError } from "@/lib/server/auth";

const IDEMPOTENCY_HEADER = "x-idempotency-key";

type RateLimitRow = {
  key: string;
  attempts: number;
  window_started_at: number;
  blocked_until: number | null;
};

type IdempotencyRow = {
  id: string;
  request_hash: string;
  response_json: string | null;
  status_code: number | null;
  expires_at: string;
};

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function getUserAgent(request: Request): string {
  return request.headers.get("user-agent")?.slice(0, 255) || "unknown";
}

function safeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.byteLength !== bBuffer.byteLength) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

function resolveAllowedOrigins(request: Request): Set<string> {
  const requestOrigin = new URL(request.url).origin;
  const configured = (process.env.APP_ALLOWED_ORIGINS ?? process.env.APP_BASE_URL ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return new Set([requestOrigin, ...configured]);
}

export function assertCsrf(request: Request): void {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return;
  }

  const allowedOrigins = resolveAllowedOrigins(request);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin) {
    if (!allowedOrigins.has(origin)) {
      throw new HttpError(403, "CSRF validation failed");
    }
    return;
  }

  if (referer) {
    for (const allowed of allowedOrigins) {
      if (referer.startsWith(`${allowed}/`) || referer === allowed) {
        return;
      }
    }
  }

  throw new HttpError(403, "CSRF validation failed");
}

export async function consumeRateLimit(params: {
  key: string;
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const row = await db
    .prepare(
      "SELECT key, attempts, window_started_at, blocked_until FROM rate_limits WHERE key = ?"
    )
    .get(params.key) as RateLimitRow | undefined;

  if (!row) {
    await db.prepare(
      `
        INSERT INTO rate_limits (key, attempts, window_started_at, blocked_until, updated_at)
        VALUES (?, 1, ?, NULL, ?)
      `
    ).run(params.key, now, nowIso());

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (row.blocked_until && row.blocked_until > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((row.blocked_until - now) / 1000)),
    };
  }

  const inWindow = now - row.window_started_at <= params.windowMs;
  const nextAttempts = inWindow ? row.attempts + 1 : 1;
  const windowStart = inWindow ? row.window_started_at : now;

  if (nextAttempts > params.maxAttempts) {
    const blockedUntil = now + params.blockDurationMs;
    await db.prepare(
      `
        UPDATE rate_limits
        SET attempts = ?, window_started_at = ?, blocked_until = ?, updated_at = ?
        WHERE key = ?
      `
    ).run(nextAttempts, windowStart, blockedUntil, nowIso(), params.key);

    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(params.blockDurationMs / 1000)),
    };
  }

  await db.prepare(
    `
      UPDATE rate_limits
      SET attempts = ?, window_started_at = ?, blocked_until = NULL, updated_at = ?
      WHERE key = ?
    `
  ).run(nextAttempts, windowStart, nowIso(), params.key);

  return { allowed: true, retryAfterSeconds: 0 };
}

export async function clearRateLimit(key: string): Promise<void> {
  await db.prepare("DELETE FROM rate_limits WHERE key = ?").run(key);
}

export function readIdempotencyKey(request: Request): string {
  const raw = request.headers.get(IDEMPOTENCY_HEADER)?.trim();

  if (!raw) {
    throw new HttpError(400, "Missing x-idempotency-key header");
  }

  if (!/^[a-zA-Z0-9._:-]{8,128}$/.test(raw)) {
    throw new HttpError(400, "Invalid x-idempotency-key header");
  }

  return raw;
}

export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function reserveIdempotencyKey(params: {
  scope: string;
  idempotencyKey: string;
  requestHash: string;
  ttlSeconds?: number;
}): Promise<{ replay: null | { statusCode: number; body: unknown } }> {
  const existing = await db
    .prepare(
      `
        SELECT id, request_hash, response_json, status_code, expires_at
        FROM idempotency_keys
        WHERE scope = ? AND idempotency_key = ?
      `
    )
    .get(params.scope, params.idempotencyKey) as IdempotencyRow | undefined;

  const nowMs = Date.now();

  if (existing) {
    if (new Date(existing.expires_at).getTime() <= nowMs) {
      await db.prepare("DELETE FROM idempotency_keys WHERE id = ?").run(existing.id);
    } else {
      if (!safeCompare(existing.request_hash, params.requestHash)) {
        throw new HttpError(409, "Idempotency key already used with a different payload");
      }

      if (existing.response_json && existing.status_code) {
        return {
          replay: {
            statusCode: existing.status_code,
            body: JSON.parse(existing.response_json),
          },
        };
      }

      return { replay: null };
    }
  }

  await db.prepare(
    `
      INSERT INTO idempotency_keys (
        id,
        scope,
        idempotency_key,
        request_hash,
        response_json,
        status_code,
        created_at,
        expires_at
      )
      VALUES (@id, @scope, @idempotency_key, @request_hash, NULL, NULL, @created_at, @expires_at)
    `
  ).run({
    id: createId("idem"),
    scope: params.scope,
    idempotency_key: params.idempotencyKey,
    request_hash: params.requestHash,
    created_at: nowIso(),
    expires_at: new Date(nowMs + (params.ttlSeconds ?? 24 * 60 * 60) * 1000).toISOString(),
  });

  return { replay: null };
}

export async function storeIdempotencyResponse(params: {
  scope: string;
  idempotencyKey: string;
  statusCode: number;
  body: unknown;
}): Promise<void> {
  await db.prepare(
    `
      UPDATE idempotency_keys
      SET response_json = ?, status_code = ?
      WHERE scope = ? AND idempotency_key = ?
    `
  ).run(JSON.stringify(params.body), params.statusCode, params.scope, params.idempotencyKey);
}