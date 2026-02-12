import { NextResponse } from "next/server";
import { checkDatabaseConnection, db } from "@/lib/server/db";
import { logError, logInfo } from "@/lib/server/logger";

export async function GET() {
  const startedAt = Date.now();

  try {
    await checkDatabaseConnection();
    const pendingDeliveries = (
      await db
        .prepare("SELECT COUNT(*) as count FROM notification_deliveries WHERE status = 'pending'")
        .get() as {
        count: number;
      }
    ).count;
    const failedDeliveries = (
      await db
        .prepare("SELECT COUNT(*) as count FROM notification_deliveries WHERE status = 'failed'")
        .get() as {
        count: number;
      }
    ).count;
    const failedWebhooks = (
      await db
        .prepare("SELECT COUNT(*) as count FROM webhook_events WHERE status = 'failed'")
        .get() as {
        count: number;
      }
    ).count;
    const activeSessions = (
      await db
        .prepare(
          "SELECT COUNT(*) as count FROM auth_sessions WHERE revoked_at IS NULL AND expires_at > ?"
        )
        .get(new Date().toISOString()) as { count: number }
    ).count;
    const latencyMs = Date.now() - startedAt;

    const payload = {
      ok: true,
      service: "hollap-api",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      latencyMs,
      db: "ok",
      version: process.env.npm_package_version ?? "0.1.0",
      metrics: {
        pendingDeliveries,
        failedDeliveries,
        failedWebhooks,
        activeSessions,
      },
    };

    logInfo("health.check", {
      ok: true,
      latencyMs,
      pendingDeliveries,
      failedDeliveries,
      failedWebhooks,
      activeSessions,
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
