import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

type LessonProgressRow = {
  lesson_id: string;
  completed: number;
};

type Params = { params: Promise<{ id: string }> };

function resolveProductId(raw: string): string {
  return raw.startsWith("prd_") || raw.startsWith("prd-") ? raw : `prd_${raw}`;
}

export async function GET(request: Request, context: Params) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const productId = resolveProductId(id);

    const product = (await db
      .prepare(
        `SELECT p.id, p.name, p.creator_id, u.name AS creator_name
         FROM products p
         JOIN users u ON u.id = p.creator_id
         WHERE p.id = ?`,
      )
      .get(productId)) as
      | { id: string; name: string; creator_id: string; creator_name: string }
      | undefined;

    if (!product) {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    // Total lesson count
    const total = (await db
      .prepare("SELECT COUNT(*)::int AS n FROM course_lessons WHERE product_id = ?")
      .get(productId)) as { n: number };

    // Completed lesson count for this user
    const progressRows = (await db
      .prepare(
        "SELECT lesson_id, completed FROM course_progress WHERE course_id = ? AND user_id = ?",
      )
      .all(productId, user.id)) as LessonProgressRow[];

    const completedCount = progressRows.filter((row) => row.completed === 1).length;
    const requiredCount = total.n > 0 ? total.n : 1;
    const eligible = completedCount >= requiredCount;

    return NextResponse.json({
      eligible,
      completedCount,
      requiredCount: total.n,
      product: { id: product.id, name: product.name, creatorName: product.creator_name },
      learner: { id: user.id, name: user.name },
      issuedAt: eligible ? new Date().toISOString() : null,
      certificateId: eligible
        ? `CERT-${product.id.slice(-6).toUpperCase()}-${user.id.slice(-6).toUpperCase()}`
        : null,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
