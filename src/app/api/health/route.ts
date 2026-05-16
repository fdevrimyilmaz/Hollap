import { NextResponse } from "next/server";
import { checkDatabaseConnection, db } from "@/lib/server/db";
import { logError, logInfo } from "@/lib/server/logger";

function canReadDetailedMetrics(request: Request): boolean {
  const internalKey = process.env.INTERNAL_HEALTH_KEY?.trim();

  if (!internalKey) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("x-internal-key") === internalKey;
}

type IntegrationStatus = "configured" | "missing" | "disabled";

function integrationStatuses(): {
  stripe: IntegrationStatus;
  smtp: IntegrationStatus;
  webPush: IntegrationStatus;
  storage: IntegrationStatus;
  oauthGoogle: IntegrationStatus;
  oauthGithub: IntegrationStatus;
} {
  const has = (key: string): boolean => Boolean(process.env[key]?.trim());

  return {
    stripe:
      has("STRIPE_SECRET_KEY") && has("STRIPE_WEBHOOK_SECRET")
        ? "configured"
        : has("STRIPE_SECRET_KEY") || has("STRIPE_WEBHOOK_SECRET")
        ? "missing"
        : "disabled",
    smtp:
      has("SMTP_HOST") && has("SMTP_USER") && has("SMTP_PASS") && has("SMTP_FROM")
        ? "configured"
        : has("SMTP_HOST")
        ? "missing"
        : "disabled",
    webPush:
      has("WEB_PUSH_PUBLIC_KEY") && has("WEB_PUSH_PRIVATE_KEY")
        ? "configured"
        : has("WEB_PUSH_PUBLIC_KEY") || has("WEB_PUSH_PRIVATE_KEY")
        ? "missing"
        : "disabled",
    storage:
      (process.env.OBJECT_STORAGE_DRIVER || "").toLowerCase() === "s3"
        ? has("OBJECT_STORAGE_BUCKET") &&
          has("OBJECT_STORAGE_ACCESS_KEY_ID") &&
          has("OBJECT_STORAGE_SECRET_ACCESS_KEY")
          ? "configured"
          : "missing"
        : (process.env.OBJECT_STORAGE_DRIVER || "").toLowerCase() === "local"
        ? "configured"
        : "missing",
    oauthGoogle:
      has("GOOGLE_OAUTH_CLIENT_ID") && has("GOOGLE_OAUTH_CLIENT_SECRET")
        ? "configured"
        : has("GOOGLE_OAUTH_CLIENT_ID") || has("GOOGLE_OAUTH_CLIENT_SECRET")
        ? "missing"
        : "disabled",
    oauthGithub:
      has("GITHUB_OAUTH_CLIENT_ID") && has("GITHUB_OAUTH_CLIENT_SECRET")
        ? "configured"
        : has("GITHUB_OAUTH_CLIENT_ID") || has("GITHUB_OAUTH_CLIENT_SECRET")
        ? "missing"
        : "disabled",
  };
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  const includeMetrics = canReadDetailedMetrics(request);

  try {
    await checkDatabaseConnection();
    let pendingDeliveries = 0;
    let failedDeliveries = 0;
    let failedWebhooks = 0;
    let activeSessions = 0;

    if (includeMetrics) {
      pendingDeliveries = (
        await db
          .prepare("SELECT COUNT(*) as count FROM notification_deliveries WHERE status = 'pending'")
          .get() as {
          count: number;
        }
      ).count;
      failedDeliveries = (
        await db
          .prepare("SELECT COUNT(*) as count FROM notification_deliveries WHERE status = 'failed'")
          .get() as {
          count: number;
        }
      ).count;
      failedWebhooks = (
        await db
          .prepare("SELECT COUNT(*) as count FROM webhook_events WHERE status = 'failed'")
          .get() as {
          count: number;
        }
      ).count;
      activeSessions = (
        await db
          .prepare(
            "SELECT COUNT(*) as count FROM auth_sessions WHERE revoked_at IS NULL AND expires_at > ?"
          )
          .get(new Date().toISOString()) as { count: number }
      ).count;
    }

    const latencyMs = Date.now() - startedAt;

    const integrations = integrationStatuses();
    const integrationDegraded = Object.values(integrations).some((v) => v === "missing");

    const payload: Record<string, unknown> = {
      ok: !integrationDegraded,
      service: "hollap-api",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      latencyMs,
      db: "ok",
      integrations,
      version: process.env.npm_package_version ?? "0.1.0",
    };

    if (includeMetrics) {
      payload.metrics = {
        pendingDeliveries,
        failedDeliveries,
        failedWebhooks,
        activeSessions,
      };
    }

    logInfo("health.check", {
      ok: true,
      latencyMs,
      includeMetrics,
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logError("health.check", {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "unknown",
    });

    const payload = {
      ok: false,
      service: "hollap-api",
      timestamp: new Date().toISOString(),
      db: "error",
      error: error instanceof Error ? error.message : "unknown",
    };

    return NextResponse.json(payload, {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
