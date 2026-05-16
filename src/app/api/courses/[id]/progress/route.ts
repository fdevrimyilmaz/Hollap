import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const updateProgressSchema = z.object({
  lessonId: z.string().trim().min(1).max(64),
  completed: z.boolean(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id: courseId } = await context.params;

    const rows = await db
      .prepare(
        `
          SELECT lesson_id, completed
          FROM course_progress
          WHERE user_id = ? AND course_id = ?
        `
      )
      .all(user.id, courseId) as Array<{ lesson_id: string; completed: number }>;

    const progress = rows.reduce<Record<string, boolean>>((acc, row) => {
      acc[row.lesson_id] = Boolean(row.completed);
      return acc;
    }, {});

    return NextResponse.json({ progress });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);
    const body = await parseJsonBody(request, updateProgressSchema);
    const { id: courseId } = await context.params;

    await db.prepare(
      `
        INSERT INTO course_progress (user_id, course_id, lesson_id, completed, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT (user_id, course_id, lesson_id)
        DO UPDATE SET
          completed = EXCLUDED.completed,
          updated_at = EXCLUDED.updated_at
      `
    ).run(user.id, courseId, body.lessonId, body.completed ? 1 : 0, nowIso());

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
