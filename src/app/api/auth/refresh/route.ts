import { NextResponse } from "next/server";
import { attachAuthCookies, authErrorResponse, rotateSession } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { assertCsrf } from "@/lib/server/security";

export async function POST(request: Request) {
  try {
    assertCsrf(request);

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
