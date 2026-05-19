import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

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

const createLessonSchema = z.object({
  title: z.string().trim().min(1).max(200),
  duration: z.string().trim().min(1).max(20).default("0:00"),
  videoUrl: z.string().trim().max(2000).url().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  isPreview: z.boolean().optional().default(false),
});

type Params = { params: Promise<{ id: string }> };

async function assertProductOwner(productId: string, userId: string): Promise<void> {
  const row = (await db
    .prepare("SELECT creator_id FROM products WHERE id = ?")
    .get(productId)) as { creator_id: string } | undefined;
  if (!row) throw new Error("Ürün bulunamadı");
  if (row.creator_id !== userId) throw new Error("Bu ürünü düzenleme yetkin yok");
}

export async function GET(request: Request, context: Params) {
  try {
    const user = await requireAuth(request, { role: "creator" });
    const { id: productId } = await context.params;
    await assertProductOwner(productId, user.id);

    const rows = (await db
      .prepare(
        `SELECT id, product_id, sort_order, title, duration, video_url, video_asset_id, is_preview
         FROM course_lessons
         WHERE product_id = ?
         ORDER BY sort_order ASC, created_at ASC`,
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
    return authErrorResponse(error);
  }
}

export async function POST(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const { id: productId } = await context.params;
    await assertProductOwner(productId, user.id);
    const body = await parseJsonBody(request, createLessonSchema);
    const ts = nowIso();

    const lastOrder = (await db
      .prepare("SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM course_lessons WHERE product_id = ?")
      .get(productId)) as { max_order: number };

    const lessonId = `les_${randomUUID()}`;

    await db
      .prepare(
        `INSERT INTO course_lessons (id, product_id, sort_order, title, duration, video_url, is_preview, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        lessonId,
        productId,
        lastOrder.max_order + 1,
        body.title,
        body.duration,
        body.videoUrl,
        body.isPreview ? 1 : 0,
        ts,
        ts,
      );

    return NextResponse.json({
      lesson: {
        id: lessonId,
        title: body.title,
        duration: body.duration,
        videoUrl: body.videoUrl,
        isPreview: body.isPreview,
        sortOrder: lastOrder.max_order + 1,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
