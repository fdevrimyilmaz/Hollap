import { NextResponse } from "next/server";
import { z } from "zod";
import { issueEmailVerificationTokenForEmail } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { sendEmailVerificationEmail } from "@/lib/server/auth-mail";
import { assertCsrf, consumeRateLimit, getClientIp } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const resendVerificationSchema = z.object({
  email: z.string().trim().email(),
});

const GENERIC_RESPONSE = {
  ok: true,
  message: "Eger e-posta dogrulama bekleniyorsa yeni dogrulama baglantisi gonderildi.",
};

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const body = await parseJsonBody(request, resendVerificationSchema);
    const email = body.email.toLowerCase();
    const clientIp = getClientIp(request);

    const ipLimiter = await consumeRateLimit({
      key: `auth:resend-verification:ip:${clientIp}`,
      maxAttempts: 8,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 30 * 60 * 1000,
    });

    if (!ipLimiter.allowed) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 202 });
    }

    const emailLimiter = await consumeRateLimit({
      key: `auth:resend-verification:email:${clientIp}:${email}`,
      maxAttempts: 3,
      windowMs: 30 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
    });

    if (!emailLimiter.allowed) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 202 });
    }

    const verificationRequest = await issueEmailVerificationTokenForEmail(email, request);

    if (verificationRequest) {
      const baseUrl = process.env.APP_BASE_URL?.trim() || new URL(request.url).origin;
      const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
      const verificationUrl = `${normalizedBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(verificationRequest.token)}`;

      await sendEmailVerificationEmail({
        to: verificationRequest.user.email,
        userName: verificationRequest.user.name,
        verificationUrl,
      });

      await writeAuditLog({
        actorUserId: verificationRequest.user.id,
        action: "auth.email_verification_resent",
        entityType: "user",
        entityId: verificationRequest.user.id,
      });
    }

    return NextResponse.json(GENERIC_RESPONSE, { status: 202 });
  } catch {
    return NextResponse.json(GENERIC_RESPONSE, { status: 202 });
  }
}
