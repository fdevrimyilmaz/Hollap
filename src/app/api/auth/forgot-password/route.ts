import { NextResponse } from "next/server";
import { z } from "zod";
import { issuePasswordResetToken } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/server/auth-mail";
import { logInfo } from "@/lib/server/logger";
import { assertCsrf, consumeRateLimit, getClientIp } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

function buildGenericResponse() {
  return {
    ok: true,
    emailDelivery: isEmailConfigured() ? ("sent" as const) : ("not_configured" as const),
    message: isEmailConfigured()
      ? "Eger bu e-posta sistemde kayitliysa sifirlama baglantisi gonderildi."
      : "E-posta servisi yapilandirilmadigi icin sifirlama baglantisi sunucu loglarinda. Yoneticiye danis.",
  };
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const body = await parseJsonBody(request, forgotPasswordSchema);
    const email = body.email.toLowerCase();
    const clientIp = getClientIp(request);

    const limiter = await consumeRateLimit({
      key: `auth:forgot-password:${clientIp}`,
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 30 * 60 * 1000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(buildGenericResponse(), {
        status: 202,
      });
    }

    const emailLimiter = await consumeRateLimit({
      key: `auth:forgot-password:email:${clientIp}:${email}`,
      maxAttempts: 3,
      windowMs: 30 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
    });

    if (!emailLimiter.allowed) {
      return NextResponse.json(buildGenericResponse(), {
        status: 202,
      });
    }

    const resetRequest = await issuePasswordResetToken(email, request);

    if (resetRequest) {
      const baseUrl = process.env.APP_BASE_URL?.trim() || new URL(request.url).origin;
      const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
      const resetUrl = `${normalizedBaseUrl}/forgot-password?token=${encodeURIComponent(resetRequest.token)}`;

      await sendPasswordResetEmail({
        to: resetRequest.user.email,
        userName: resetRequest.user.name,
        resetUrl,
      });

      await writeAuditLog({
        actorUserId: resetRequest.user.id,
        action: "auth.password_reset_requested",
        entityType: "user",
        entityId: resetRequest.user.id,
      });

      logInfo("auth.password_reset_requested", {
        userId: resetRequest.user.id,
      });
    }

    return NextResponse.json(buildGenericResponse(), { status: 202 });
  } catch {
    return NextResponse.json(buildGenericResponse(), { status: 202 });
  }
}
