import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const MAX_THUMB_BYTES = 2_500_000;

const bodySchema = z.object({
  url: z
    .string()
    .min(1)
    .max(MAX_THUMB_BYTES)
    .refine(
      (value) => /^(https?:\/\/|data:image\/(png|jpe?g|webp);base64,)/i.test(value),
      "Geçersiz görsel. Yalnızca http(s) URL veya data:image/<png|jpeg|webp>;base64 desteklenir.",
    )
    .nullable(),
});

type Params = { params: Promise<{ id: string }> };

async function assertProductOwner(productId: string, userId: string): Promise<void> {
  const row = (await db
    .prepare("SELECT creator_id FROM products WHERE id = ?")
    .get(productId)) as { creator_id: string } | undefined;
  if (!row) throw new Error("Ürün bulunamadı");
  if (row.creator_id !== userId) throw new Error("Bu ürünü düzenleme yetkin yok");
}

export async function POST(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const { id: productId } = await context.params;
    await assertProductOwner(productId, user.id);
    const body = await parseJsonBody(request, bodySchema);
    const ts = nowIso();

    await db
      .prepare("UPDATE products SET thumbnail_url = ?, updated_at = ? WHERE id = ?")
      .run(body.url, ts, productId);

    return NextResponse.json({ ok: true, thumbnailUrl: body.url });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const { id: productId } = await context.params;
    await assertProductOwner(productId, user.id);
    const ts = nowIso();

    await db
      .prepare("UPDATE products SET thumbnail_url = NULL, updated_at = ? WHERE id = ?")
      .run(ts, productId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
