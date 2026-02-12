import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createId, db, nowIso } from "@/lib/server/db";
import type { UserRole } from "@/lib/server/types";

const SESSION_COOKIE = "creatorhub_session";
const REFRESH_COOKIE = "creatorhub_refresh";
const ACCESS_TTL_SECONDS = 60 * 60 * 12;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30;
const EMAIL_VERIFICATION_TTL_SECONDS = 60 * 60 * 24;
const PASSWORD_RESET_TTL_SECONDS = 60 * 30;
const DUMMY_PASSWORD_HASH = "$2b$10$8tRjSpm4ha6tMF5T6QYw5e2LkYVfCENRzNrW2N7DbStO2Qe6hw2lG";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password_hash: string;
  email_verified_at: string | null;
};

type AuthSessionRow = {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  expires_at: string;
  revoked_at: string | null;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type AuthSessionInfo = {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  isCurrent: boolean;
};

type SessionClaims = JWTPayload & {
  sub: string;
  sid: string;
  role: UserRole;
  email: string;
  name: string;
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getJwtSecret(): Uint8Array {
  const secret =
    process.env.APP_JWT_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "dev-only-insecure-jwt-secret");

  if (!secret) {
    throw new Error("APP_JWT_SECRET is required in production");
  }

  return new TextEncoder().encode(secret);
}

function getRefreshTokenSecret(): string {
  const secret =
    process.env.REFRESH_TOKEN_SECRET ??
    process.env.APP_JWT_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "dev-only-insecure-refresh-secret");

  if (!secret) {
    throw new Error("REFRESH_TOKEN_SECRET is required in production");
  }

  return secret;
}

function getPasswordResetSecret(): string {
  const secret =
    process.env.PASSWORD_RESET_TOKEN_SECRET ??
    process.env.APP_JWT_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "dev-only-insecure-reset-secret");

  if (!secret) {
    throw new Error("PASSWORD_RESET_TOKEN_SECRET is required in production");
  }

  return secret;
}

function getEmailVerificationSecret(): string {
  const secret =
    process.env.EMAIL_VERIFICATION_TOKEN_SECRET ??
    process.env.APP_JWT_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "dev-only-insecure-email-verify-secret");

  if (!secret) {
    throw new Error("EMAIL_VERIFICATION_TOKEN_SECRET is required in production");
  }

  return secret;
}

function getCookieSameSite(): "lax" | "strict" | "none" {
  const configured = process.env.AUTH_COOKIE_SAME_SITE?.trim().toLowerCase();
  if (configured === "strict" || configured === "none" || configured === "lax") {
    return configured;
  }

  return "lax";
}

function getCookieSecurityOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: "/";
} {
  const sameSite = getCookieSameSite();
  const secure =
    process.env.AUTH_COOKIE_SECURE === "true" ||
    process.env.NODE_ENV === "production" ||
    sameSite === "none";

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  };
}

function pickSafeUser(user: UserRow): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function parseCookieValue(request: Request | NextRequest, key: string): string | null {
  if ("cookies" in request && typeof request.cookies.get === "function") {
    return request.cookies.get(key)?.value ?? null;
  }

  const header = request.headers.get("cookie") ?? "";
  const values = header.split(";").map((part) => part.trim());
  for (const value of values) {
    const [cookieKey, ...rest] = value.split("=");
    if (cookieKey === key) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

function getRequestIp(request: Request | NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function getUserAgent(request: Request | NextRequest): string {
  return request.headers.get("user-agent")?.slice(0, 255) || "unknown";
}

function hashToken(secret: string, token: string): string {
  return createHash("sha256")
    .update(`${secret}:${token}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const first = Buffer.from(a);
  const second = Buffer.from(b);

  if (first.byteLength !== second.byteLength) {
    return false;
  }

  return timingSafeEqual(first, second);
}

function hashRefreshToken(token: string): string {
  return hashToken(getRefreshTokenSecret(), token);
}

function hashPasswordResetToken(token: string): string {
  return hashToken(getPasswordResetSecret(), token);
}

function hashEmailVerificationToken(token: string): string {
  return hashToken(getEmailVerificationSecret(), token);
}

function createRawToken(size = 48): string {
  return randomBytes(size).toString("base64url");
}

function buildRefreshCookieValue(sessionId: string, rawToken: string): string {
  return `${sessionId}.${rawToken}`;
}

function parseRefreshCookieValue(rawCookie: string | null): { sessionId: string; token: string } | null {
  if (!rawCookie) {
    return null;
  }

  const [sessionId, token] = rawCookie.split(".");

  if (!sessionId || !token) {
    return null;
  }

  if (!/^sess_[a-zA-Z0-9_-]{8,}$/.test(sessionId)) {
    return null;
  }

  return { sessionId, token };
}

export async function issueSessionToken(user: AuthUser, sessionId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sid: sessionId,
    role: user.role,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TTL_SECONDS)
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

    if (!payload.sub || !payload.sid || !payload.role || !payload.email || !payload.name) {
      throw new HttpError(401, "Invalid session payload");
    }

    return payload as SessionClaims;
  } catch {
    throw new HttpError(401, "Invalid or expired session token");
  }
}

export function attachSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    ...getCookieSecurityOptions(),
    maxAge: ACCESS_TTL_SECONDS,
  });
}

export function attachRefreshCookie(response: NextResponse, cookieValue: string): void {
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: cookieValue,
    ...getCookieSecurityOptions(),
    maxAge: REFRESH_TTL_SECONDS,
  });
}

export function attachAuthCookies(
  response: NextResponse,
  tokens: {
    accessToken: string;
    refreshCookieValue: string;
  }
): void {
  attachSessionCookie(response, tokens.accessToken);
  attachRefreshCookie(response, tokens.refreshCookieValue);
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    ...getCookieSecurityOptions(),
    maxAge: 0,
  });
}

export function clearRefreshCookie(response: NextResponse): void {
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: "",
    ...getCookieSecurityOptions(),
    maxAge: 0,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  clearSessionCookie(response);
  clearRefreshCookie(response);
}

export async function authenticate(email: string, password: string): Promise<AuthUser | null> {
  const user = await db
    .prepare(
      "SELECT id, name, email, role, password_hash, email_verified_at FROM users WHERE LOWER(email) = LOWER(?)"
    )
    .get(email) as UserRow | undefined;

  if (!user) {
    await compare(password, DUMMY_PASSWORD_HASH);
    return null;
  }

  const isValid = await compare(password, user.password_hash);
  if (!isValid) {
    return null;
  }

  if (!user.email_verified_at) {
    return null;
  }

  await db.prepare("UPDATE users SET updated_at = ? WHERE id = ?").run(nowIso(), user.id);
  return pickSafeUser(user);
}

export async function createUser(params: {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  id: string;
}): Promise<AuthUser> {
  const now = nowIso();

  await db.prepare(
    `
      INSERT INTO users (id, name, email, password_hash, role, email_verified_at, created_at, updated_at)
      VALUES (@id, @name, @email, @password_hash, @role, NULL, @created_at, @updated_at)
    `
  ).run({
    id: params.id,
    name: params.name,
    email: params.email,
    password_hash: params.passwordHash,
    role: params.role,
    created_at: now,
    updated_at: now,
  });

  return {
    id: params.id,
    name: params.name,
    email: params.email,
    role: params.role,
  };
}

export async function startUserSession(params: {
  user: AuthUser;
  request: Request | NextRequest;
}): Promise<{
  sessionId: string;
  accessToken: string;
  refreshCookieValue: string;
}> {
  const now = nowIso();
  const sessionId = createId("sess");
  const rawRefreshToken = createRawToken();

  await db.prepare(
    `
      INSERT INTO auth_sessions (
        id,
        user_id,
        refresh_token_hash,
        user_agent,
        ip_address,
        created_at,
        updated_at,
        last_seen_at,
        expires_at,
        revoked_at,
        replaced_by_session_id
      )
      VALUES (
        @id,
        @user_id,
        @refresh_token_hash,
        @user_agent,
        @ip_address,
        @created_at,
        @updated_at,
        @last_seen_at,
        @expires_at,
        NULL,
        NULL
      )
    `
  ).run({
    id: sessionId,
    user_id: params.user.id,
    refresh_token_hash: hashRefreshToken(rawRefreshToken),
    user_agent: getUserAgent(params.request),
    ip_address: getRequestIp(params.request),
    created_at: now,
    updated_at: now,
    last_seen_at: now,
    expires_at: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000).toISOString(),
  });

  return {
    sessionId,
    accessToken: await issueSessionToken(params.user, sessionId),
    refreshCookieValue: buildRefreshCookieValue(sessionId, rawRefreshToken),
  };
}

export async function rotateSession(
  request: Request | NextRequest
): Promise<{
  user: AuthUser;
  sessionId: string;
  accessToken: string;
  refreshCookieValue: string;
}> {
  const refreshCookie = parseCookieValue(request, REFRESH_COOKIE);
  const parsed = parseRefreshCookieValue(refreshCookie);

  if (!parsed) {
    throw new HttpError(401, "Refresh token is missing");
  }

  const session = await db
    .prepare(
      `
        SELECT id, user_id, refresh_token_hash, expires_at, revoked_at
        FROM auth_sessions
        WHERE id = ?
      `
    )
    .get(parsed.sessionId) as AuthSessionRow | undefined;

  if (!session || session.revoked_at) {
    throw new HttpError(401, "Session is not active");
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    throw new HttpError(401, "Session is expired");
  }

  const currentHash = hashRefreshToken(parsed.token);
  if (!safeEqual(currentHash, session.refresh_token_hash)) {
    throw new HttpError(401, "Invalid refresh token");
  }

  const user = await db
    .prepare("SELECT id, name, email, role, password_hash, email_verified_at FROM users WHERE id = ?")
    .get(session.user_id) as UserRow | undefined;

  if (!user) {
    throw new HttpError(401, "Session user not found");
  }

  const newRawRefreshToken = createRawToken();
  const now = nowIso();

  await db.prepare(
    `
      UPDATE auth_sessions
      SET refresh_token_hash = ?,
          updated_at = ?,
          last_seen_at = ?,
          expires_at = ?
      WHERE id = ?
    `
  ).run(
    hashRefreshToken(newRawRefreshToken),
    now,
    now,
    new Date(Date.now() + REFRESH_TTL_SECONDS * 1000).toISOString(),
    session.id
  );

  const safeUser = pickSafeUser(user);

  return {
    user: safeUser,
    sessionId: session.id,
    accessToken: await issueSessionToken(safeUser, session.id),
    refreshCookieValue: buildRefreshCookieValue(session.id, newRawRefreshToken),
  };
}

export async function revokeSessionById(params: { sessionId: string; userId?: string }): Promise<void> {
  if (params.userId) {
    await db.prepare(
      `
        UPDATE auth_sessions
        SET revoked_at = ?, updated_at = ?
        WHERE id = ? AND user_id = ? AND revoked_at IS NULL
      `
    ).run(nowIso(), nowIso(), params.sessionId, params.userId);
    return;
  }

  await db.prepare(
    `
      UPDATE auth_sessions
      SET revoked_at = ?, updated_at = ?
      WHERE id = ? AND revoked_at IS NULL
    `
  ).run(nowIso(), nowIso(), params.sessionId);
}

export async function revokeSessionsForUser(userId: string): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE auth_sessions
        SET revoked_at = ?, updated_at = ?
        WHERE user_id = ? AND revoked_at IS NULL
      `
    )
    .run(nowIso(), nowIso(), userId);

  return result.changes;
}

export async function revokeOtherSessionsForUser(params: {
  userId: string;
  currentSessionId: string;
}): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE auth_sessions
        SET revoked_at = ?, updated_at = ?
        WHERE user_id = ?
          AND id <> ?
          AND revoked_at IS NULL
      `
    )
    .run(nowIso(), nowIso(), params.userId, params.currentSessionId);

  return result.changes;
}

export async function revokeUserSession(params: {
  userId: string;
  sessionId: string;
}): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE auth_sessions
        SET revoked_at = ?, updated_at = ?
        WHERE id = ? AND user_id = ? AND revoked_at IS NULL
      `
    )
    .run(nowIso(), nowIso(), params.sessionId, params.userId);

  return result.changes;
}

export async function listUserSessions(params: {
  userId: string;
  currentSessionId?: string;
}): Promise<AuthSessionInfo[]> {
  const rows = await db
    .prepare(
      `
        SELECT id, user_agent, ip_address, created_at, last_seen_at, expires_at, revoked_at
        FROM auth_sessions
        WHERE user_id = ?
        ORDER BY created_at DESC
      `
    )
    .all(params.userId) as Array<{
      id: string;
      user_agent: string | null;
      ip_address: string | null;
      created_at: string;
      last_seen_at: string;
      expires_at: string;
      revoked_at: string | null;
    }>;

  return rows.map((row) => ({
    id: row.id,
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    isCurrent: row.id === params.currentSessionId,
  }));
}

export async function revokeSessionFromRequest(request: Request | NextRequest): Promise<void> {
  const refreshCookie = parseCookieValue(request, REFRESH_COOKIE);
  const parsed = parseRefreshCookieValue(refreshCookie);

  if (!parsed) {
    return;
  }

  await revokeSessionById({ sessionId: parsed.sessionId });
}

async function resolveAuthState(
  request: Request | NextRequest,
  options?: { role?: UserRole }
): Promise<{ user: AuthUser; sessionId: string }> {
  const token = parseCookieValue(request, SESSION_COOKIE);

  if (!token) {
    throw new HttpError(401, "Authentication required");
  }

  const payload = await verifySessionToken(token);

  const session = await db
    .prepare(
      `
        SELECT id, user_id, refresh_token_hash, expires_at, revoked_at
        FROM auth_sessions
        WHERE id = ?
      `
    )
    .get(payload.sid) as AuthSessionRow | undefined;

  if (!session || session.user_id !== payload.sub) {
    throw new HttpError(401, "Session not found");
  }

  if (session.revoked_at) {
    throw new HttpError(401, "Session revoked");
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    throw new HttpError(401, "Session expired");
  }

  const user = await db
    .prepare("SELECT id, name, email, role, password_hash, email_verified_at FROM users WHERE id = ?")
    .get(payload.sub) as UserRow | undefined;

  if (!user) {
    throw new HttpError(401, "Session user not found");
  }

  if (!user.email_verified_at) {
    throw new HttpError(401, "Email verification required");
  }

  if (options?.role && user.role !== options.role) {
    throw new HttpError(403, "Insufficient permissions");
  }

  return {
    user: pickSafeUser(user),
    sessionId: session.id,
  };
}

export async function requireAuth(
  request: Request | NextRequest,
  options?: { role?: UserRole }
): Promise<AuthUser> {
  const authState = await resolveAuthState(request, options);
  return authState.user;
}

export async function requireAuthSession(
  request: Request | NextRequest,
  options?: { role?: UserRole }
): Promise<{ user: AuthUser; sessionId: string }> {
  return resolveAuthState(request, options);
}

async function issueEmailVerificationTokenForUser(
  user: UserRow,
  request: Request | NextRequest
): Promise<{ user: AuthUser; token: string } | null> {
  if (user.email_verified_at) {
    return null;
  }

  const token = createRawToken(32);
  const tokenHash = hashEmailVerificationToken(token);
  const now = nowIso();

  await db.prepare("DELETE FROM email_verification_tokens WHERE user_id = ?").run(user.id);

  await db.prepare(
    `
      INSERT INTO email_verification_tokens (
        id,
        user_id,
        token_hash,
        expires_at,
        used_at,
        requested_ip,
        user_agent,
        created_at
      )
      VALUES (
        @id,
        @user_id,
        @token_hash,
        @expires_at,
        NULL,
        @requested_ip,
        @user_agent,
        @created_at
      )
    `
  ).run({
    id: createId("mailverify"),
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + EMAIL_VERIFICATION_TTL_SECONDS * 1000).toISOString(),
    requested_ip: getRequestIp(request),
    user_agent: getUserAgent(request),
    created_at: now,
  });

  return {
    user: pickSafeUser(user),
    token,
  };
}

export async function issueEmailVerificationTokenForUserId(
  userId: string,
  request: Request | NextRequest
): Promise<{ user: AuthUser; token: string } | null> {
  const user = await db
    .prepare("SELECT id, name, email, role, password_hash, email_verified_at FROM users WHERE id = ?")
    .get(userId) as UserRow | undefined;

  if (!user) {
    return null;
  }

  return issueEmailVerificationTokenForUser(user, request);
}

export async function issueEmailVerificationTokenForEmail(
  email: string,
  request: Request | NextRequest
): Promise<{ user: AuthUser; token: string } | null> {
  const user = await db
    .prepare("SELECT id, name, email, role, password_hash, email_verified_at FROM users WHERE LOWER(email) = LOWER(?)")
    .get(email) as UserRow | undefined;

  if (!user) {
    return null;
  }

  return issueEmailVerificationTokenForUser(user, request);
}

export async function verifyEmailWithToken(token: string): Promise<AuthUser> {
  const tokenHash = hashEmailVerificationToken(token);
  const now = nowIso();

  return db.transaction(async () => {
    const consumed = await db
      .prepare(
        `
          UPDATE email_verification_tokens
          SET used_at = @used_at
          WHERE token_hash = @token_hash
            AND used_at IS NULL
            AND expires_at > @used_at
          RETURNING id, user_id
        `
      )
      .get({
        used_at: now,
        token_hash: tokenHash,
      }) as { id: string; user_id: string } | undefined;

    if (!consumed) {
      throw new HttpError(400, "Invalid or expired email verification token");
    }

    const user = await db
      .prepare("SELECT id, name, email, role, password_hash, email_verified_at FROM users WHERE id = ?")
      .get(consumed.user_id) as UserRow | undefined;

    if (!user) {
      throw new HttpError(400, "Invalid email verification token");
    }

    await db.prepare("UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?").run(
      now,
      now,
      consumed.user_id
    );

    await db.prepare("DELETE FROM email_verification_tokens WHERE user_id = ? AND id <> ?").run(
      consumed.user_id,
      consumed.id
    );

    return pickSafeUser(user);
  });
}

export async function issuePasswordResetToken(
  email: string,
  request: Request | NextRequest
): Promise<{ user: AuthUser; token: string } | null> {
  const user = await db
    .prepare("SELECT id, name, email, role, password_hash, email_verified_at FROM users WHERE LOWER(email) = LOWER(?)")
    .get(email) as UserRow | undefined;

  if (!user) {
    return null;
  }

  const token = createRawToken(32);
  const tokenHash = hashPasswordResetToken(token);
  const now = nowIso();

  await db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(user.id);

  await db.prepare(
    `
      INSERT INTO password_reset_tokens (
        id,
        user_id,
        token_hash,
        expires_at,
        used_at,
        requested_ip,
        user_agent,
        created_at
      )
      VALUES (
        @id,
        @user_id,
        @token_hash,
        @expires_at,
        NULL,
        @requested_ip,
        @user_agent,
        @created_at
      )
    `
  ).run({
    id: createId("pwdreset"),
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000).toISOString(),
    requested_ip: getRequestIp(request),
    user_agent: getUserAgent(request),
    created_at: now,
  });

  return {
    user: pickSafeUser(user),
    token,
  };
}

export async function resetPasswordWithToken(token: string, nextPassword: string): Promise<void> {
  const tokenHash = hashPasswordResetToken(token);
  const now = nowIso();
  const passwordHash = await hash(nextPassword, 10);

  await db.transaction(async () => {
    const consumed = await db
      .prepare(
        `
          UPDATE password_reset_tokens
          SET used_at = @used_at
          WHERE token_hash = @token_hash
            AND used_at IS NULL
            AND expires_at > @used_at
          RETURNING id, user_id
        `
      )
      .get({
        used_at: now,
        token_hash: tokenHash,
      }) as { id: string; user_id: string } | undefined;

    if (!consumed) {
      throw new HttpError(400, "Invalid or expired password reset token");
    }

    const user = await db
      .prepare("SELECT id FROM users WHERE id = ?")
      .get(consumed.user_id) as { id: string } | undefined;

    if (!user) {
      throw new HttpError(400, "Invalid password reset token");
    }

    await db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
      passwordHash,
      now,
      consumed.user_id
    );

    await db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? AND id <> ?").run(
      consumed.user_id,
      consumed.id
    );

    await db.prepare(
      `
        UPDATE auth_sessions
        SET revoked_at = ?, updated_at = ?
        WHERE user_id = ? AND revoked_at IS NULL
      `
    ).run(now, now, consumed.user_id);
  });
}

export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}

export { SESSION_COOKIE, REFRESH_COOKIE, HttpError };
