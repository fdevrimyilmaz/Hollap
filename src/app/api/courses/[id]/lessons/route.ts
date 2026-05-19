import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";

type LessonRow = {
  id: string;
  product_id: string;
  sort_order: number;
  title: string;
  duration: string;
  video_url: string | null;
  video_asset_id: string | null;
  is_preview: number;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const productId = id.startsWith("prd_") || id.startsWith("prd-") ? id : `prd_${id}`;

  try {
    const rows = (await db
      .prepare(
        `
          SELECT id, product_id, sort_order, title, duration, video_url, video_asset_id, is_preview
          FROM course_lessons
          WHERE product_id = ?
          ORDER BY sort_order ASC, created_at ASC
        `,
      )
      .all(productId)) as LessonRow[];

    return NextResponse.json({
      lessons: rows.map((row) => ({
        id: row.id,
        title: row.title,
        duration: row.duration,
        videoUrl: row.video_url,
        videoAssetId: row.video_asset_id,
        isPreview: row.is_preview === 1,
        sortOrder: row.sort_order,
      })),
    });
  } catch (error) {
    console.error("[GET /api/courses/lessons]", error);
    return NextResponse.json({ lessons: [] });
  }
}
