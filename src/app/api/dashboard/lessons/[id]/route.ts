import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const updateLessonSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  duration: z.string().trim().min(1).max(20).optional(),
  videoUrl: z.string().trim().max(2000).url().optional().or(z.literal("")).nullable().transform((v) => (v ? v : null)),
  videoAssetId: z.string().trim().min(1).max(128).nullable().optional(),
  isPreview: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
});

type Params = { params: Promise<{ id: string }> };

async function assertLessonOwner(lessonId: string, userId: string): Promise<string> {
  const row = (await db
    .prepare(
      `SELECT l.product_id, p.creator_id
       FROM course_lessons l
       JOIN products p ON p.id = l.product_id
       WHERE l.id = ?`,
    )
    .get(lessonId)) as { product_id: string; creator_id: string } | undefined;
  if (!row) throw new Error("Ders bulunamadı");
  if (row.creator_id !== userId) throw new Error("Bu dersi düzenleme yetkin yok");
  return row.product_id;
}

export async function PATCH(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const { id: lessonId } = await context.params;
    await assertLessonOwner(lessonId, user.id);
    const body = await parseJsonBody(request, updateLessonSchema);
    const ts = nowIso();

    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    if (body.title !== undefined) {
      fields.push("title = ?");
      values.push(body.title);
    }
    if (body.duration !== undefined) {
      fields.push("duration = ?");
      values.push(body.duration);
    }
    if (body.videoUrl !== undefined) {
      fields.push("video_url = ?");
      values.push(body.videoUrl);
    }
    if (body.videoAssetId !== undefined) {
      fields.push("video_asset_id = ?");
      values.push(body.videoAssetId);
    }
    if (body.isPreview !== undefined) {
      fields.push("is_preview = ?");
      values.push(body.isPreview ? 1 : 0);
    }
    if (body.sortOrder !== undefined) {
      fields.push("sort_order = ?");
      values.push(body.sortOrder);
    }

    if (fields.length === 0) {
      return NextResponse.json({ ok: true });
    }

    fields.push("updated_at = ?");
    values.push(ts);
    values.push(lessonId);

    await db
      .prepare(`UPDATE course_lessons SET ${fields.join(", ")} WHERE id = ?`)
      .run(...values);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const { id: lessonId } = await context.params;
    await assertLessonOwner(lessonId, user.id);

    await db.prepare("DELETE FROM course_lessons WHERE id = ?").run(lessonId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
