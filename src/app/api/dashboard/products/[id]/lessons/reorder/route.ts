import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const reorderSchema = z.object({
  /** Array of lesson IDs in their NEW desired order, top to bottom. */
  lessonIds: z.array(z.string().trim().min(1).max(64)).min(1).max(500),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const { id: productId } = await context.params;

    const product = (await db
      .prepare("SELECT creator_id FROM products WHERE id = ?")
      .get(productId)) as { creator_id: string } | undefined;
    if (!product) throw new Error("Ürün bulunamadı");
    if (product.creator_id !== user.id) throw new Error("Bu ürünü düzenleme yetkin yok");

    const body = await parseJsonBody(request, reorderSchema);
    const ts = nowIso();

    // Verify every supplied lesson belongs to this product.
    const owned = (await db
      .prepare("SELECT id FROM course_lessons WHERE product_id = ?")
      .all(productId)) as Array<{ id: string }>;
    const ownedIds = new Set(owned.map((row) => row.id));
    for (const id of body.lessonIds) {
      if (!ownedIds.has(id)) {
        return NextResponse.json({ error: "Geçersiz ders ID'si" }, { status: 400 });
      }
    }

    const stmt = db.prepare(
      "UPDATE course_lessons SET sort_order = ?, updated_at = ? WHERE id = ? AND product_id = ?",
    );

    await db.transaction(async () => {
      for (let i = 0; i < body.lessonIds.length; i += 1) {
        await stmt.run(i, ts, body.lessonIds[i], productId);
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
