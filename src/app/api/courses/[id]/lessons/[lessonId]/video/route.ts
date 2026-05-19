import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { createPrivateDownloadUrl } from "@/lib/server/files";

type LessonAccessRow = {
  product_id: string;
  is_preview: number;
  video_asset_id: string | null;
  video_url: string | null;
  creator_id: string;
};

type Params = {
  params: Promise<{ id: string; lessonId: string }>;
};

export async function GET(request: Request, context: Params) {
  try {
    const { lessonId } = await context.params;

    const lesson = (await db
      .prepare(
        `
          SELECT
            l.product_id,
            l.is_preview,
            l.video_asset_id,
            l.video_url,
            p.creator_id
          FROM course_lessons l
          JOIN products p ON p.id = l.product_id
          WHERE l.id = ?
        `,
      )
      .get(lessonId)) as LessonAccessRow | undefined;

    if (!lesson) {
      return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });
    }

    // No video has been uploaded for this lesson yet.
    if (!lesson.video_asset_id && !lesson.video_url) {
      return NextResponse.json({ error: "Bu derse henüz video yüklenmemiş" }, { status: 404 });
    }

    // Preview lessons stream publicly (no auth required).
    if (lesson.is_preview === 1) {
      if (lesson.video_url) {
        return NextResponse.json({ videoUrl: lesson.video_url, expiresInSeconds: 0 });
      }
      // Even previews behind asset_id need a signed URL → we still require a user for grant-based access.
      // For local/dev convenience, fall through to the auth path below; preview public assets
      // would need a separate ungrant-bypass code path in production.
    }

    // Anything else requires an authenticated user.
    const user = await requireAuth(request);

    // Creator always has access. Otherwise check sales for this product.
    let hasAccess = lesson.creator_id === user.id;

    if (!hasAccess) {
      const purchase = (await db
        .prepare(
          "SELECT id FROM sales WHERE product_id = ? AND buyer_id = ? LIMIT 1",
        )
        .get(lesson.product_id, user.id)) as { id: string } | undefined;
      hasAccess = Boolean(purchase);
    }

    if (!hasAccess && lesson.is_preview !== 1) {
      return NextResponse.json({ error: "Bu dersi izlemek için ürünü satın almalısın" }, { status: 403 });
    }

    if (lesson.video_asset_id) {
      const signed = await createPrivateDownloadUrl({
        assetId: lesson.video_asset_id,
        user,
        origin: new URL(request.url).origin,
      });
      return NextResponse.json({
        videoUrl: signed.downloadUrl,
        expiresInSeconds: signed.expiresInSeconds,
      });
    }

    return NextResponse.json({ videoUrl: lesson.video_url, expiresInSeconds: 0 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
