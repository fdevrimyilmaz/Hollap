import nodemailer from "nodemailer";
import { db } from "@/lib/server/db";
import { logInfo, logWarn } from "@/lib/server/logger";

type CreatorRow = {
  id: string;
  name: string;
  email: string;
};

type CreatorWeekStats = {
  salesCount: number;
  grossCents: number;
  netCents: number;
  newSubscribers: number;
  newReviews: number;
};

const CREATOR_SHARE = 0.8;

let cachedTransporter: nodemailer.Transporter | null = null;

function hasSmtpConfig(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): nodemailer.Transporter | null {
  if (!hasSmtpConfig()) return null;
  if (cachedTransporter) return cachedTransporter;
  const host = process.env.SMTP_HOST as string;
  const port = Number(process.env.SMTP_PORT ?? 587);
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER as string,
      pass: process.env.SMTP_PASS as string,
    },
  });
  return cachedTransporter;
}

export async function listActiveCreators(): Promise<CreatorRow[]> {
  return (await db
    .prepare("SELECT id, name, email FROM users WHERE role = 'creator'")
    .all()) as CreatorRow[];
}

export async function buildWeeklyDigestStats(
  creatorId: string,
  sinceIso: string,
): Promise<CreatorWeekStats> {
  const sales = (await db
    .prepare(
      `SELECT COUNT(*)::int AS sales_count, COALESCE(SUM(amount_cents), 0)::int AS gross
       FROM sales WHERE creator_id = ? AND created_at >= ?`,
    )
    .get(creatorId, sinceIso)) as { sales_count: number; gross: number };

  const subs = (await db
    .prepare(
      "SELECT COUNT(*)::int AS n FROM subscriptions WHERE creator_id = ? AND created_at >= ?",
    )
    .get(creatorId, sinceIso)) as { n: number };

  const reviews = (await db
    .prepare(
      `SELECT COUNT(*)::int AS n
       FROM course_reviews r
       JOIN products p ON p.id = r.product_id
       WHERE p.creator_id = ? AND r.created_at >= ?`,
    )
    .get(creatorId, sinceIso)) as { n: number };

  return {
    salesCount: sales.sales_count,
    grossCents: sales.gross,
    netCents: Math.round(sales.gross * CREATOR_SHARE),
    newSubscribers: subs.n,
    newReviews: reviews.n,
  };
}

export function renderDigestHtml(opts: {
  creatorName: string;
  stats: CreatorWeekStats;
  baseUrl: string;
}): string {
  const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  return `
<!doctype html>
<html lang="tr">
  <body style="margin:0;padding:24px;background:#0a0a0a;color:#fff;font-family:Inter,-apple-system,Segoe UI,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#111;border:1px solid #2a2a2a;border-radius:16px;padding:28px;">
      <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;">Merhaba ${opts.creatorName} 👋</h1>
      <p style="color:#aaa;margin:0 0 24px;font-size:14px;">Bu haftaki özetin:</p>
      <table style="width:100%;border-collapse:collapse;">
        ${[
          ["Satış", String(opts.stats.salesCount)],
          ["Brüt gelir", formatUsd(opts.stats.grossCents)],
          ["Net kazanç (%80)", formatUsd(opts.stats.netCents)],
          ["Yeni abone", String(opts.stats.newSubscribers)],
          ["Yeni yorum", String(opts.stats.newReviews)],
        ].map(([label, value]) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1f1f1f;color:#888;font-size:13px;">${label}</td>
            <td style="padding:10px 0;border-bottom:1px solid #1f1f1f;text-align:right;color:#fff;font-weight:600;font-size:14px;font-variant-numeric:tabular-nums;">${value}</td>
          </tr>
        `).join("")}
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${opts.baseUrl}/dashboard/analytics" style="display:inline-block;background:linear-gradient(135deg,#f97316,#f59e0b);color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600;font-size:14px;">
          Detaylı analitik →
        </a>
      </div>
      <p style="margin:24px 0 0;color:#666;font-size:12px;text-align:center;">
        Hollap haftalık özet · <a href="${opts.baseUrl}/dashboard/settings" style="color:#888;">Bildirim tercihleri</a>
      </p>
    </div>
  </body>
</html>`.trim();
}

export async function sendDigestEmail(opts: {
  to: string;
  creatorName: string;
  stats: CreatorWeekStats;
  baseUrl: string;
}): Promise<{ sent: boolean; mode: "smtp" | "console" }> {
  const html = renderDigestHtml({
    creatorName: opts.creatorName,
    stats: opts.stats,
    baseUrl: opts.baseUrl,
  });

  const transporter = getTransporter();
  if (!transporter) {
    console.log(
      `\n┌─ 📧 [DEV E-POSTA · Haftalık Özet] ─────────────\n│ Alıcı: ${opts.to}\n│ Satış: ${opts.stats.salesCount}, Net: $${(opts.stats.netCents / 100).toFixed(2)}\n│ (SMTP yapılandırılmadığı için konsola yazıldı)\n└─\n`,
    );
    logInfo("digest.email_dev_console", { email: opts.to });
    return { sent: false, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "no-reply@hollap.local",
      to: opts.to,
      subject: "🎯 Hollap haftalık özet",
      html,
    });
    logInfo("digest.email_sent", { email: opts.to });
    return { sent: true, mode: "smtp" };
  } catch (error) {
    logWarn("digest.email_failed", {
      email: opts.to,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return { sent: false, mode: "smtp" };
  }
}
