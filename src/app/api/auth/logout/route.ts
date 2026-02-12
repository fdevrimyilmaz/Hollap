import { NextResponse } from "next/server";
import { authErrorResponse, clearAuthCookies, revokeSessionFromRequest } from "@/lib/server/auth";
import { assertCsrf, consumeRateLimit, getClientIp } from "@/lib/server/security";

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const limiter = await consumeRateLimit({
      key: `auth:logout:ip:${getClientIp(request)}`,
      maxAttempts: 80,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 15 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many logout attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limiter.retryAfterSeconds),
          },
        }
      );
    }

    await revokeSessionFromRequest(request);

    const response = NextResponse.json({ ok: true });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
