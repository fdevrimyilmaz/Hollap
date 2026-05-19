import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createId } from "@/lib/server/db";
import {
  authErrorResponse,
  createUser,
  issueEmailVerificationTokenForUserId,
} from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { isEmailConfigured, sendEmailVerificationEmail } from "@/lib/server/auth-mail";
import { assertCsrf, consumeRateLimit, getClientIp } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";
import type { UserRole } from "@/lib/server/types";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["creator", "subscriber"]).optional(),
});

const SIGNUP_RESPONSE_WITH_EMAIL = {
  ok: true,
  emailDelivery: "sent" as const,
  message: "Kayit alindi. Lutfen e-posta kutunuzu kontrol edip hesabinizi dogrulayin.",
};

const SIGNUP_RESPONSE_NO_EMAIL = {
  ok: true,
  emailDelivery: "not_configured" as const,
  message:
    "Kayit alindi. E-posta servisi yapilandirilmadigi icin dogrulama linki sunucu loglarinda. Yoneticiye danis.",
};

export async function POST(request: Request) {
  try {
    assertCsrf(request);

    const body = await parseJsonBody(request, signupSchema);
    const email = body.email.toLowerCase();
    const role: UserRole = body.role === "creator" ? "creator" : "subscriber";
    const clientIp = getClientIp(request);

    const ipLimit = await consumeRateLimit({
      key: `auth:signup:ip:${clientIp}`,
      maxAttempts: 10,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 30 * 60 * 1000,
    });

    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Cok fazla kayit denemesi yapildi. Lutfen daha sonra tekrar deneyin." },
        {
          status: 429,
          headers: {
            "Retry-After": String(ipLimit.retryAfterSeconds),
          },
        }
      );
    }

    const emailLimit = await consumeRateLimit({
      key: `auth:signup:email:${clientIp}:${email}`,
      maxAttempts: 4,
      windowMs: 30 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
    });

    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: "Bu e-posta icin cok fazla kayit denemesi yapildi. Lutfen daha sonra tekrar deneyin." },
        {
          status: 429,
          headers: {
            "Retry-After": String(emailLimit.retryAfterSeconds),
          },
        }
      );
    }

    const passwordHash = await hash(body.password, 10);
    let createdUser: { id: string; name: string; email: string; role: UserRole };

    try {
      createdUser = await createUser({
        id: createId("usr"),
        name: body.name,
        email,
        passwordHash,
        role,
      });

      await writeAuditLog({
        actorUserId: createdUser.id,
        action: "auth.signup_success",
        entityType: "user",
        entityId: createdUser.id,
        metadata: {
          role: createdUser.role,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: unknown }).code ?? "")
          : "";
      const isUniqueViolation = message.includes("UNIQUE") || code === "23505";

      if (!isUniqueViolation) {
        throw error;
      }

      await writeAuditLog({
        action: "auth.signup_duplicate",
        entityType: "user",
        metadata: { email },
      });

      return NextResponse.json(
        {
          error:
            "Bu e-posta adresi ile olusturulmus bir hesap zaten var. Giris yapabilir veya sifre sifirlama kullanabilirsiniz.",
        },
        { status: 409 }
      );
    }

    const verificationRequest = await issueEmailVerificationTokenForUserId(createdUser.id, request);

    if (verificationRequest) {
      const baseUrl = process.env.APP_BASE_URL?.trim() || new URL(request.url).origin;
      const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
      const verificationUrl = `${normalizedBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(verificationRequest.token)}`;

      await sendEmailVerificationEmail({
        to: verificationRequest.user.email,
        userName: verificationRequest.user.name,
        verificationUrl,
      });
    }

    return NextResponse.json(
      isEmailConfigured() ? SIGNUP_RESPONSE_WITH_EMAIL : SIGNUP_RESPONSE_NO_EMAIL,
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
