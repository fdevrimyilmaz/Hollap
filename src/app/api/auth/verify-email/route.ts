import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, verifyEmailWithToken } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { assertCsrf, consumeRateLimit, getClientIp } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const verifyEmailSchema = z.object({
  token: z.string().trim().min(16).max(512),
});

function buildLoginRedirectUrl(request: Request): URL {
  const baseUrl = process.env.APP_BASE_URL?.trim() || new URL(request.url).origin;
  return new URL("/login", baseUrl);
}

export async function GET(request: Request) {
  const loginUrl = buildLoginRedirectUrl(request);
  const token = new URL(request.url).searchParams.get("token")?.trim();

  if (!token) {
    loginUrl.searchParams.set("verified", "0");
    return NextResponse.redirect(loginUrl);
  }

  const limiter = await consumeRateLimit({
    key: `auth:verify-email:ip:${getClientIp(request)}`,
    maxAttempts: 40,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 30 * 60 * 1000,
  });

  if (!limiter.allowed) {
    loginUrl.searchParams.set("verified", "0");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const user = await verifyEmailWithToken(token);
    loginUrl.searchParams.set("verified", "1");

    await writeAuditLog({
      actorUserId: user.id,
      action: "auth.email_verified",
      entityType: "user",
      entityId: user.id,
    });
  } catch {
    loginUrl.searchParams.set("verified", "0");
  }

  return NextResponse.redirect(loginUrl);
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const limiter = await consumeRateLimit({
      key: `auth:verify-email:ip:${getClientIp(request)}`,
      maxAttempts: 40,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 30 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limiter.retryAfterSeconds),
          },
        }
      );
    }

    const body = await parseJsonBody(request, verifyEmailSchema);
    const user = await verifyEmailWithToken(body.token);

    await writeAuditLog({
      actorUserId: user.id,
      action: "auth.email_verified",
      entityType: "user",
      entityId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
