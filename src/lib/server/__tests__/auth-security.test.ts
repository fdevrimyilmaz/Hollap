import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/lib/server/types";

let db: (typeof import("@/lib/server/db"))["db"];
let createId: (typeof import("@/lib/server/db"))["createId"];
let createUser: (typeof import("@/lib/server/auth"))["createUser"];
let issueEmailVerificationTokenForUserId: (typeof import("@/lib/server/auth"))["issueEmailVerificationTokenForUserId"];
let verifyEmailWithToken: (typeof import("@/lib/server/auth"))["verifyEmailWithToken"];
let issuePasswordResetToken: (typeof import("@/lib/server/auth"))["issuePasswordResetToken"];
let resetPasswordWithToken: (typeof import("@/lib/server/auth"))["resetPasswordWithToken"];
let consumeRateLimit: (typeof import("@/lib/server/security"))["consumeRateLimit"];
let clearRateLimit: (typeof import("@/lib/server/security"))["clearRateLimit"];

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeWithDatabase = hasDatabase ? describe : describe.skip;

beforeAll(async () => {
  if (!hasDatabase) {
    return;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "creatorhub-auth-"));
  process.env.CREATORHUB_TEST_TMP = tempDir;
  process.env.APP_JWT_SECRET = "unit-test-jwt-secret";
  process.env.REFRESH_TOKEN_SECRET = "unit-test-refresh-secret";
  process.env.PASSWORD_RESET_TOKEN_SECRET = "unit-test-password-reset-secret";
  process.env.EMAIL_VERIFICATION_TOKEN_SECRET = "unit-test-email-verify-secret";

  delete (globalThis as { __creatorhubDbPool?: unknown }).__creatorhubDbPool;
  delete (globalThis as { __creatorhubDbInitPromise?: unknown }).__creatorhubDbInitPromise;
  vi.resetModules();

  ({ db, createId } = await import("@/lib/server/db"));

  const auth = await import("@/lib/server/auth");
  createUser = auth.createUser;
  issueEmailVerificationTokenForUserId = auth.issueEmailVerificationTokenForUserId;
  verifyEmailWithToken = auth.verifyEmailWithToken;
  issuePasswordResetToken = auth.issuePasswordResetToken;
  resetPasswordWithToken = auth.resetPasswordWithToken;

  const security = await import("@/lib/server/security");
  consumeRateLimit = security.consumeRateLimit;
  clearRateLimit = security.clearRateLimit;
});

afterAll(async () => {
  if (!hasDatabase) {
    return;
  }

  await db.close();
});

function buildRequest(ip = "127.0.0.1"): Request {
  return new Request("http://localhost/api/auth/test", {
    headers: {
      "x-forwarded-for": ip,
      "user-agent": "vitest",
    },
  });
}

async function createTestUser(role: UserRole = "subscriber"): Promise<{ id: string; email: string }> {
  const id = createId("usr");
  const email = `${id}@example.com`.toLowerCase();

  await createUser({
    id,
    name: `Test ${id}`,
    email,
    passwordHash: "not-used-in-this-test",
    role,
  });

  return { id, email };
}

describeWithDatabase("auth token security", () => {
  it("enforces email verification token single-use", async () => {
    const user = await createTestUser();
    const issued = await issueEmailVerificationTokenForUserId(user.id, buildRequest());

    expect(issued).not.toBeNull();
    await verifyEmailWithToken(issued?.token ?? "");

    const firstUse = await db
      .prepare("SELECT email_verified_at FROM users WHERE id = ?")
      .get(user.id) as { email_verified_at: string | null };

    expect(firstUse.email_verified_at).not.toBeNull();

    await expect(verifyEmailWithToken(issued?.token ?? "")).rejects.toThrow(
      "Invalid or expired email verification token"
    );
  });

  it("rejects expired email verification tokens", async () => {
    const user = await createTestUser();
    const issued = await issueEmailVerificationTokenForUserId(user.id, buildRequest("127.0.0.2"));

    expect(issued).not.toBeNull();

    await db.prepare("UPDATE email_verification_tokens SET expires_at = ? WHERE user_id = ?").run(
      new Date(Date.now() - 60_000).toISOString(),
      user.id
    );

    await expect(verifyEmailWithToken(issued?.token ?? "")).rejects.toThrow(
      "Invalid or expired email verification token"
    );
  });

  it("enforces password reset token single-use", async () => {
    const user = await createTestUser();
    const issued = await issuePasswordResetToken(user.email, buildRequest("127.0.0.3"));

    expect(issued).not.toBeNull();
    await resetPasswordWithToken(issued?.token ?? "", "NewPassword123!");

    await expect(resetPasswordWithToken(issued?.token ?? "", "AnotherPassword123!")).rejects.toThrow(
      "Invalid or expired password reset token"
    );
  });

  it("rejects expired password reset tokens", async () => {
    const user = await createTestUser();
    const issued = await issuePasswordResetToken(user.email, buildRequest("127.0.0.4"));

    expect(issued).not.toBeNull();

    await db.prepare("UPDATE password_reset_tokens SET expires_at = ? WHERE user_id = ?").run(
      new Date(Date.now() - 60_000).toISOString(),
      user.id
    );

    await expect(resetPasswordWithToken(issued?.token ?? "", "FreshPassword123!")).rejects.toThrow(
      "Invalid or expired password reset token"
    );
  });
});

describeWithDatabase("auth rate limits", () => {
  it("blocks after max attempts and resets when cleared", async () => {
    const key = `auth:test-rate:${createId("rl")}`;

    await clearRateLimit(key);

    const first = await consumeRateLimit({
      key,
      maxAttempts: 1,
      windowMs: 5 * 60 * 1000,
      blockDurationMs: 60 * 1000,
    });
    const second = await consumeRateLimit({
      key,
      maxAttempts: 1,
      windowMs: 5 * 60 * 1000,
      blockDurationMs: 60 * 1000,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.retryAfterSeconds).toBeGreaterThan(0);

    await clearRateLimit(key);

    const afterClear = await consumeRateLimit({
      key,
      maxAttempts: 1,
      windowMs: 5 * 60 * 1000,
      blockDurationMs: 60 * 1000,
    });

    expect(afterClear.allowed).toBe(true);
  });
});
