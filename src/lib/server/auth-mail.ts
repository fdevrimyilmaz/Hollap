import nodemailer from "nodemailer";
import { logInfo, logWarn } from "@/lib/server/logger";

let smtpTransporter: nodemailer.Transporter | null = null;

function hasSmtpConfig(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function isEmailConfigured(): boolean {
  return hasSmtpConfig();
}

function getSmtpTransporter(): nodemailer.Transporter {
  if (smtpTransporter) {
    return smtpTransporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is missing");
  }

  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return smtpTransporter;
}

function logDevEmail(kind: string, payload: { to: string; subject: string; link: string }): void {
  console.log(
    `\n┌─ 📧 [DEV E-POSTA · ${kind}] ─────────────────────────────────\n` +
      `│ Alıcı:   ${payload.to}\n` +
      `│ Konu:    ${payload.subject}\n` +
      `│ Bağlantı:\n│   ${payload.link}\n` +
      `└─ SMTP yapılandırılmadığı için konsola yazıldı. .env.local'e SMTP_* ekleyince gerçek e-posta gönderilir.\n`,
  );
}

export async function sendPasswordResetEmail(params: {
  to: string;
  userName: string;
  resetUrl: string;
}): Promise<void> {
  if (!hasSmtpConfig()) {
    logDevEmail("Şifre Sıfırlama", {
      to: params.to,
      subject: "Şifre Sıfırlama Talebi",
      link: params.resetUrl,
    });
    logInfo("auth.password_reset_email_dev_console", { email: params.to });
    return;
  }

  try {
    const transporter = getSmtpTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "no-reply@hollap.local",
      to: params.to,
      subject: "Şifre Sıfırlama Talebi",
      text: `Merhaba ${params.userName},\n\nŞifreni sıfırlamak için aşağıdaki bağlantıyı kullan:\n${params.resetUrl}\n\nBu bağlantı 30 dakika içinde geçersiz olur.\n\n— Hollap`,
    });

    logInfo("auth.password_reset_email_sent", { email: params.to });
  } catch (error) {
    logWarn("auth.password_reset_email_fallback", {
      email: params.to,
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function sendEmailVerificationEmail(params: {
  to: string;
  userName: string;
  verificationUrl: string;
}): Promise<void> {
  if (!hasSmtpConfig()) {
    logDevEmail("E-posta Doğrulama", {
      to: params.to,
      subject: "E-posta Doğrulama",
      link: params.verificationUrl,
    });
    logInfo("auth.email_verification_email_dev_console", { email: params.to });
    return;
  }

  try {
    const transporter = getSmtpTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "no-reply@hollap.local",
      to: params.to,
      subject: "E-posta Doğrulama",
      text: `Merhaba ${params.userName},\n\nHesabını doğrulamak için aşağıdaki bağlantıyı kullan:\n${params.verificationUrl}\n\nBu bağlantı 24 saat içinde geçersiz olur.\n\n— Hollap`,
    });

    logInfo("auth.email_verification_email_sent", { email: params.to });
  } catch (error) {
    logWarn("auth.email_verification_email_fallback", {
      email: params.to,
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}
