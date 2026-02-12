import { NextResponse } from "next/server";
import { authErrorResponse, requireAuthSession } from "@/lib/server/auth";
import { consumeRateLimit, getClientIp } from "@/lib/server/security";

export async function GET(request: Request) {
  try {
    const limiter = await consumeRateLimit({
      key: `auth:me:ip:${getClientIp(request)}`,
      maxAttempts: 120,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 10 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many session checks. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limiter.retryAfterSeconds),
          },
        }
      );
    }

    const session = await requireAuthSession(request);
    return NextResponse.json({ user: session.user, sessionId: session.sessionId });
  } catch (error) {
    return authErrorResponse(error);
  }
}
