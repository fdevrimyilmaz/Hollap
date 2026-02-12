import nodemailer from "nodemailer";
import { logInfo, logWarn } from "@/lib/server/logger";

let smtpTransporter: nodemailer.Transporter | null = null;

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
    auth: {
      user,
      pass,
    },
  });

  return smtpTransporter;
}

export async function sendPasswordResetEmail(params: {
  to: string;
  userName: string;
  resetUrl: string;
}): Promise<void> {
  try {
    const transporter = getSmtpTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "no-reply@hollap.local",
      to: params.to,
      subject: "Sifre Sifirlama Talebi",
      text: `${params.userName},\n\nSifrenizi sifirlamak icin bu linki kullanin:\n${params.resetUrl}\n\nBu link 30 dakika icinde gecersiz olur.`,
    });

    logInfo("auth.password_reset_email_sent", { email: params.to });
  } catch (error) {
    logWarn("auth.password_reset_email_fallback", {
      email: params.to,
      resetUrl: params.resetUrl,
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function sendEmailVerificationEmail(params: {
  to: string;
  userName: string;
  verificationUrl: string;
}): Promise<void> {
  try {
    const transporter = getSmtpTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "no-reply@hollap.local",
      to: params.to,
      subject: "E-posta Dogrulama",
      text: `${params.userName},\n\nHesabinizi dogrulamak icin bu linki kullanin:\n${params.verificationUrl}\n\nBu link 24 saat icinde gecersiz olur.`,
    });

    logInfo("auth.email_verification_email_sent", { email: params.to });
  } catch (error) {
    logWarn("auth.email_verification_email_fallback", {
      email: params.to,
      verificationUrl: params.verificationUrl,
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}
