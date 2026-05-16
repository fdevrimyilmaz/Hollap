import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { createId, db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const questionSchema = z.object({
  text: z.string().trim().min(2).max(1000),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const rows = await db
    .prepare(
      `
        SELECT id, user_name, body, upvotes, created_at
        FROM course_questions
        WHERE course_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `
    )
    .all(id) as Array<{
      id: string;
      user_name: string;
      body: string;
      upvotes: number;
      created_at: string;
    }>;

  return NextResponse.json({
    questions: rows.map((row) => ({
      id: row.id,
      user: row.user_name,
      text: row.body,
      upvotes: row.upvotes,
      createdAt: row.created_at,
    })),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);
    const body = await parseJsonBody(request, questionSchema);
    const { id: courseId } = await context.params;
    const createdAt = nowIso();
    const questionId = createId("q");

    await db.prepare(
      `
        INSERT INTO course_questions (id, course_id, user_id, user_name, body, upvotes, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `
    ).run(questionId, courseId, user.id, user.name, body.text, createdAt);

    return NextResponse.json({
      question: {
        id: questionId,
        user: user.name,
        text: body.text,
        upvotes: 0,
        createdAt,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
