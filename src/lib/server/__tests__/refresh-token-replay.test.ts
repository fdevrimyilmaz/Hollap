import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

let db: (typeof import("@/lib/server/db"))["db"];
let createId: (typeof import("@/lib/server/db"))["createId"];
let nowIso: (typeof import("@/lib/server/db"))["nowIso"];
let createUser: (typeof import("@/lib/server/auth"))["createUser"];
let startUserSession: (typeof import("@/lib/server/auth"))["startUserSession"];
let rotateSession: (typeof import("@/lib/server/auth"))["rotateSession"];
let HttpError: (typeof import("@/lib/server/auth"))["HttpError"];

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeWithDatabase = hasDatabase ? describe : describe.skip;

beforeAll(async () => {
  if (!hasDatabase) return;

  process.env.APP_JWT_SECRET = "unit-test-jwt-secret";
  process.env.REFRESH_TOKEN_SECRET = "unit-test-refresh-secret";
  process.env.PASSWORD_RESET_TOKEN_SECRET = "unit-test-password-reset-secret";
  process.env.EMAIL_VERIFICATION_TOKEN_SECRET = "unit-test-email-verify-secret";

  delete (globalThis as { __creatorhubDbPool?: unknown }).__creatorhubDbPool;
  delete (globalThis as { __creatorhubDbInitPromise?: unknown }).__creatorhubDbInitPromise;
  vi.resetModules();

  ({ db, createId, nowIso } = await import("@/lib/server/db"));
  const auth = await import("@/lib/server/auth");
  createUser = auth.createUser;
  startUserSession = auth.startUserSession;
  rotateSession = auth.rotateSession;
  HttpError = auth.HttpError;
});

afterAll(async () => {
  if (!hasDatabase) return;
  await db.close();
});

function buildRequest(refreshCookieValue: string): Request {
  return new Request("http://localhost/api/auth/refresh", {
    method: "POST",
    headers: {
      cookie: `creatorhub_refresh=${encodeURIComponent(refreshCookieValue)}`,
      "x-forwarded-for": "127.0.0.1",
      "user-agent": "vitest",
    },
  });
}

async function markEmailVerified(userId: string): Promise<void> {
  await db
    .prepare("UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?")
    .run(nowIso(), nowIso(), userId);
}

describeWithDatabase("refresh token replay detection", () => {
  it("revokes session and rejects rotation when previous refresh token is replayed", async () => {
    const userId = createId("usr");
    const email = `${userId}@example.com`.toLowerCase();

    await createUser({
      id: userId,
      name: `Replay Test ${userId}`,
      email,
      passwordHash: "not-used",
      role: "subscriber",
    });
    await markEmailVerified(userId);

    const startReq = buildRequest("placeholder");
    const initialSession = await startUserSession({
      user: { id: userId, name: `Replay Test ${userId}`, email, role: "subscriber" },
      request: startReq,
    });

    const firstRotation = await rotateSession(buildRequest(initialSession.refreshCookieValue));
    expect(firstRotation.sessionId).toBe(initialSession.sessionId);
    expect(firstRotation.refreshCookieValue).not.toBe(initialSession.refreshCookieValue);

    let replayError: unknown = null;
    try {
      await rotateSession(buildRequest(initialSession.refreshCookieValue));
    } catch (error) {
      replayError = error;
    }

    expect(replayError).toBeInstanceOf(HttpError);
    expect((replayError as InstanceType<typeof HttpError>).status).toBe(401);
    expect((replayError as Error).message).toMatch(/token reuse/i);

    const row = (await db
      .prepare("SELECT revoked_at FROM auth_sessions WHERE id = ?")
      .get(initialSession.sessionId)) as { revoked_at: string | null } | undefined;

    expect(row?.revoked_at).not.toBeNull();

    const auditRow = (await db
      .prepare(
        "SELECT id FROM audit_logs WHERE action = ? AND entity_id = ? ORDER BY created_at DESC LIMIT 1"
      )
      .get("auth.refresh_token_replay_detected", initialSession.sessionId)) as
      | { id: string }
      | undefined;

    expect(auditRow).toBeDefined();
  });

  it("rejects rotation with an invalid token without revoking the session", async () => {
    const userId = createId("usr");
    const email = `${userId}@example.com`.toLowerCase();

    await createUser({
      id: userId,
      name: `Bad Token ${userId}`,
      email,
      passwordHash: "not-used",
      role: "subscriber",
    });
    await markEmailVerified(userId);

    const session = await startUserSession({
      user: { id: userId, name: `Bad Token ${userId}`, email, role: "subscriber" },
      request: buildRequest("placeholder"),
    });

    const malformedCookie = `${session.sessionId.split(".")[0]}.totally-wrong-token-value`;

    let bogusError: unknown = null;
    try {
      await rotateSession(buildRequest(malformedCookie));
    } catch (error) {
      bogusError = error;
    }

    expect(bogusError).toBeInstanceOf(HttpError);

    const row = (await db
      .prepare("SELECT revoked_at FROM auth_sessions WHERE id = ?")
      .get(session.sessionId)) as { revoked_at: string | null } | undefined;

    // Bogus token attempt should NOT revoke the session; only replay of the
    // previously-rotated token triggers session-wide revocation.
    expect(row?.revoked_at).toBeNull();
  });
});
