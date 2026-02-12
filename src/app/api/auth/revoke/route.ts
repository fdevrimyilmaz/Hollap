import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authErrorResponse,
  clearAuthCookies,
  requireAuthSession,
  revokeSessionById,
  revokeSessionsForUser,
} from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { assertCsrf, consumeRateLimit, getClientIp } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const revokeSchema = z.object({
  all: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const limiter = await consumeRateLimit({
      key: `auth:revoke:ip:${getClientIp(request)}`,
      maxAttempts: 60,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 15 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many revoke attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limiter.retryAfterSeconds),
          },
        }
      );
    }

    const authState = await requireAuthSession(request);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    const body =
      contentLength > 0
        ? await parseJsonBody(request, revokeSchema)
        : { all: false };

    let revoked = 0;

    if (body.all) {
      revoked = await revokeSessionsForUser(authState.user.id);
    } else {
      await revokeSessionById({
        sessionId: authState.sessionId,
        userId: authState.user.id,
      });
      revoked = 1;
    }

    await writeAuditLog({
      actorUserId: authState.user.id,
      action: body.all ? "auth.sessions_revoked_all" : "auth.session_revoked",
      entityType: "auth_session",
      entityId: body.all ? null : authState.sessionId,
      metadata: {
        revoked,
      },
    });

    const response = NextResponse.json({
      ok: true,
      revoked,
      all: Boolean(body.all),
    });

    clearAuthCookies(response);

    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
