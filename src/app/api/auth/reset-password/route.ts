import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, resetPasswordWithToken } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { assertCsrf, consumeRateLimit, getClientIp } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const resetPasswordSchema = z.object({
  token: z.string().trim().min(16).max(512),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const limiter = await consumeRateLimit({
      key: `auth:reset-password:ip:${getClientIp(request)}`,
      maxAttempts: 20,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 30 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many password reset attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limiter.retryAfterSeconds),
          },
        }
      );
    }

    const body = await parseJsonBody(request, resetPasswordSchema);

    await resetPasswordWithToken(body.token, body.password);

    await writeAuditLog({
      action: "auth.password_reset_completed",
      entityType: "password_reset_token",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
