import { NextResponse } from "next/server";
import { attachAuthCookies, authErrorResponse, rotateSession } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { assertCsrf, consumeRateLimit, getClientIp } from "@/lib/server/security";

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const limiter = await consumeRateLimit({
      key: `auth:refresh:ip:${getClientIp(request)}`,
      maxAttempts: 60,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 15 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many refresh attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limiter.retryAfterSeconds),
          },
        }
      );
    }

    const rotated = await rotateSession(request);

    const response = NextResponse.json({
      ok: true,
      user: rotated.user,
      sessionId: rotated.sessionId,
    });

    attachAuthCookies(response, {
      accessToken: rotated.accessToken,
      refreshCookieValue: rotated.refreshCookieValue,
    });

    await writeAuditLog({
      actorUserId: rotated.user.id,
      action: "auth.session_refreshed",
      entityType: "auth_session",
      entityId: rotated.sessionId,
    });

    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
