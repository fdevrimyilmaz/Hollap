import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authErrorResponse,
  attachAuthCookies,
  authenticate,
  startUserSession,
} from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { logInfo, logWarn } from "@/lib/server/logger";
import { assertCsrf, clearRateLimit, consumeRateLimit, getClientIp } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const body = await parseJsonBody(request, loginSchema);
    const email = body.email.trim().toLowerCase();
    const password = body.password;
    const clientIp = getClientIp(request);

    const ipLimit = await consumeRateLimit({
      key: `auth:login:ip:${clientIp}`,
      maxAttempts: 30,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 30 * 60 * 1000,
    });

    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(ipLimit.retryAfterSeconds),
          },
        }
      );
    }

    const accountLimit = await consumeRateLimit({
      key: `auth:login:account:${clientIp}:${email}`,
      maxAttempts: 6,
      windowMs: 10 * 60 * 1000,
      blockDurationMs: 20 * 60 * 1000,
    });

    if (!accountLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(accountLimit.retryAfterSeconds),
          },
        }
      );
    }

    const user = await authenticate(email, password);

    if (!user) {
      logWarn("auth.login_failed", {
        email,
        ip: clientIp,
      });

      await writeAuditLog({
        action: "auth.login_failed",
        entityType: "user",
        metadata: { email },
      });

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await clearRateLimit(`auth:login:ip:${clientIp}`);
    await clearRateLimit(`auth:login:account:${clientIp}:${email}`);

    const tokens = await startUserSession({ user, request });
    const response = NextResponse.json({ user });
    attachAuthCookies(response, {
      accessToken: tokens.accessToken,
      refreshCookieValue: tokens.refreshCookieValue,
    });

    await writeAuditLog({
      actorUserId: user.id,
      action: "auth.login_success",
      entityType: "user",
      entityId: user.id,
    });

    logInfo("auth.login_success", {
      userId: user.id,
      sessionId: tokens.sessionId,
      ip: clientIp,
    });

    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
