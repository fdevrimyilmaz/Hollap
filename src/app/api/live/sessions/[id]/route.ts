import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";

type LiveSessionRow = {
  id: string;
  creator_id: string;
  title: string;
  schedule: string;
  booked: number;
  total: number;
  status: string;
  playback_url: string | null;
};

type CreatorRow = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const session = (await db
      .prepare(
        `
          SELECT id, creator_id, title, schedule, booked, total, status, playback_url
          FROM live_sessions
          WHERE id = ?
        `,
      )
      .get(id)) as LiveSessionRow | undefined;

    if (!session) {
      return NextResponse.json({ error: "Yayın bulunamadı" }, { status: 404 });
    }

    const creator = (await db
      .prepare("SELECT id, name, avatar_url FROM users WHERE id = ?")
      .get(session.creator_id)) as CreatorRow | undefined;

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        schedule: session.schedule,
        booked: session.booked,
        total: session.total,
        status: session.status,
        isLive: session.status === "live",
        playbackUrl: session.playback_url,
        creator: creator
          ? { id: creator.id, name: creator.name, avatarUrl: creator.avatar_url }
          : null,
      },
    });
  } catch (error) {
    console.error("[GET /api/live/sessions/:id]", error);
    return NextResponse.json({ error: "Yayın yüklenemedi" }, { status: 500 });
  }
}
