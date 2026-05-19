import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { isLiveProviderConfigured } from "@/lib/server/live";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const createSessionSchema = z.object({
  title: z.string().trim().min(3).max(200),
  schedule: z.string().trim().min(1).max(120).default("Şimdi"),
  total: z.number().int().min(0).max(100_000).default(0),
});

export async function GET() {
  return NextResponse.json({ providerConfigured: isLiveProviderConfigured() });
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });

    if (!isLiveProviderConfigured()) {
      return NextResponse.json(
        {
          error:
            "Canlı yayın sağlayıcısı yapılandırılmamış. MUX_TOKEN_ID ve MUX_TOKEN_SECRET ayarlanmalı.",
          providerConfigured: false,
        },
        { status: 503 },
      );
    }

    const body = await parseJsonBody(request, createSessionSchema);
    const ts = nowIso();
    const id = `live_${randomUUID()}`;

    await db
      .prepare(
        `
          INSERT INTO live_sessions
            (id, creator_id, title, schedule, booked, total, status, stream_key, playback_url, created_at, updated_at)
          VALUES
            (?, ?, ?, ?, 0, ?, 'scheduled', NULL, NULL, ?, ?)
        `,
      )
      .run(id, user.id, body.title, body.schedule, body.total, ts, ts);

    return NextResponse.json({
      session: {
        id,
        title: body.title,
        schedule: body.schedule,
        booked: 0,
        total: body.total,
        isLive: false,
        streamKeyAvailable: false,
        playbackUrl: null,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
