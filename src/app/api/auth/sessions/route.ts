import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authErrorResponse,
  listUserSessions,
  revokeOtherSessionsForUser,
  requireAuthSession,
  revokeSessionsForUser,
  revokeUserSession,
} from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { assertCsrf, consumeRateLimit, getClientIp } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const revokeSessionSchema = z.object({
  sessionId: z.string().trim().min(1).optional(),
  all: z.boolean().optional(),
  others: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const limiter = await consumeRateLimit({
      key: `auth:sessions:get:ip:${getClientIp(request)}`,
      maxAttempts: 120,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 10 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many session requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limiter.retryAfterSeconds),
          },
        }
      );
    }

    const authState = await requireAuthSession(request);

    const sessions = await listUserSessions({
      userId: authState.user.id,
      currentSessionId: authState.sessionId,
    });

    return NextResponse.json({
      sessions,
      currentSessionId: authState.sessionId,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertCsrf(request);
    const limiter = await consumeRateLimit({
      key: `auth:sessions:delete:ip:${getClientIp(request)}`,
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
        ? await parseJsonBody(request, revokeSessionSchema)
        : { sessionId: undefined, all: false, others: false };

    if (body.all) {
      const revoked = await revokeSessionsForUser(authState.user.id);

      await writeAuditLog({
        actorUserId: authState.user.id,
        action: "auth.sessions_revoked_all",
        entityType: "auth_session",
        metadata: { revoked },
      });

      return NextResponse.json({ ok: true, revoked });
    }

    if (body.others) {
      const revoked = await revokeOtherSessionsForUser({
        userId: authState.user.id,
        currentSessionId: authState.sessionId,
      });

      await writeAuditLog({
        actorUserId: authState.user.id,
        action: "auth.sessions_revoked_others",
        entityType: "auth_session",
        entityId: authState.sessionId,
        metadata: { revoked },
      });

      return NextResponse.json({ ok: true, revoked });
    }

    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const revoked = await revokeUserSession({
      userId: authState.user.id,
      sessionId: body.sessionId,
    });

    await writeAuditLog({
      actorUserId: authState.user.id,
      action: "auth.session_revoked",
      entityType: "auth_session",
      entityId: body.sessionId,
      metadata: { revoked },
    });

    return NextResponse.json({ ok: true, revoked });
  } catch (error) {
    return authErrorResponse(error);
  }
}
