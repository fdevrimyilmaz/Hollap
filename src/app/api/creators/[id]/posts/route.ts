import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const postSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  visibility: z.enum(["public", "subscribers"]).default("public"),
});

type Params = { params: Promise<{ id: string }> };

type PostRow = {
  id: string;
  body: string;
  visibility: string;
  created_at: string;
};

export async function GET(request: Request, context: Params) {
  try {
    const { id: creatorId } = await context.params;

    // Find out viewer's relationship to determine visible posts.
    let viewerId: string | null = null;
    try {
      const viewer = await requireAuth(request);
      viewerId = viewer.id;
    } catch {
      // unauthenticated viewer; only public posts
    }

    const isCreator = viewerId === creatorId;
    let isSubscriber = false;
    if (viewerId && !isCreator) {
      const sub = (await db
        .prepare(
          `SELECT id FROM subscriptions
           WHERE creator_id = ? AND subscriber_id = ?
             AND (active = 1 OR LOWER(stripe_status) IN ('active', 'trialing'))`,
        )
        .get(creatorId, viewerId)) as { id: string } | undefined;
      isSubscriber = Boolean(sub);
    }

    const canSeeAll = isCreator || isSubscriber;
    const filter = canSeeAll ? "" : "AND visibility = 'public'";

    const rows = (await db
      .prepare(
        `SELECT id, body, visibility, created_at
         FROM creator_posts
         WHERE creator_id = ? ${filter}
         ORDER BY created_at DESC
         LIMIT 50`,
      )
      .all(creatorId)) as PostRow[];

    return NextResponse.json({
      posts: rows.map((row) => ({
        id: row.id,
        body: row.body,
        visibility: row.visibility,
        createdAt: row.created_at,
      })),
      viewer: { isCreator, isSubscriber },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);
    const { id: creatorId } = await context.params;

    if (user.id !== creatorId) {
      return NextResponse.json({ error: "Yalnızca kendi akışına yazabilirsin" }, { status: 403 });
    }

    const body = await parseJsonBody(request, postSchema);
    const ts = nowIso();
    const id = `post_${randomUUID()}`;

    await db
      .prepare(
        "INSERT INTO creator_posts (id, creator_id, body, visibility, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(id, creatorId, body.body, body.visibility, ts);

    return NextResponse.json({
      post: {
        id,
        body: body.body,
        visibility: body.visibility,
        createdAt: ts,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
