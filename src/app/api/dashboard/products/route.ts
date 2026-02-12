import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { writeAuditLog } from "@/lib/server/audit";
import { createId, db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const createProductSchema = z.object({
  name: z.string().trim().min(2).max(140),
  price: z.number().positive().max(1_000_000),
  stock: z.number().int().min(0).max(1_000_000),
});

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const body = await parseJsonBody(request, createProductSchema);

    const id = createId("prd");
    const now = nowIso();

    await db.prepare(
      `
        INSERT INTO products (id, creator_id, name, price_cents, stock, sold, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)
      `
    ).run(id, user.id, body.name, Math.round(body.price * 100), body.stock, now, now);

    await writeAuditLog({
      actorUserId: user.id,
      action: "product.created",
      entityType: "product",
      entityId: id,
      metadata: {
        name: body.name,
        price: body.price,
        stock: body.stock,
      },
    });

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
