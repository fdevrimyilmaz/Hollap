import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

type Params = {
  params: Promise<{ id: string }>;
};

type ProductRow = {
  id: string;
  name: string;
  price_cents: number;
  stock: number;
  is_active: number;
};

const patchProductSchema = z
  .object({
    name: z.string().trim().min(2).max(140).optional(),
    price: z.number().positive().max(1_000_000).optional(),
    stock: z.number().int().min(0).max(1_000_000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export async function PATCH(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const { id } = await context.params;
    const body = await parseJsonBody(request, patchProductSchema);

    const existing = await db
      .prepare(
        `
          SELECT id, name, price_cents, stock, is_active
          FROM products
          WHERE id = ? AND creator_id = ?
        `
      )
      .get(id, user.id) as ProductRow | undefined;

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const nextName = body.name ?? existing.name;
    const nextPrice = body.price ?? existing.price_cents / 100;
    const nextStock = body.stock ?? existing.stock;
    const nextActive = body.isActive === undefined ? existing.is_active : body.isActive ? 1 : 0;

    const normalizedPriceCents = Math.round(nextPrice * 100);
    const now = nowIso();

    await db.prepare(
      `
        UPDATE products
        SET name = ?,
            price_cents = ?,
            stock = ?,
            is_active = ?,
            updated_at = ?
        WHERE id = ? AND creator_id = ?
      `
    ).run(nextName, normalizedPriceCents, nextStock, nextActive, now, id, user.id);

    await writeAuditLog({
      actorUserId: user.id,
      action: "product.updated",
      entityType: "product",
      entityId: id,
      metadata: {
        name: nextName,
        price: normalizedPriceCents / 100,
        stock: nextStock,
        isActive: Boolean(nextActive),
      },
    });

    return NextResponse.json({
      ok: true,
      product: {
        id,
        name: nextName,
        price: normalizedPriceCents / 100,
        stock: nextStock,
        isActive: Boolean(nextActive),
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
