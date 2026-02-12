import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { writeAuditLog } from "@/lib/server/audit";
import { assertCsrf } from "@/lib/server/security";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request, { role: "creator" });
    const { id } = await context.params;

    const updateResult = await db
      .prepare(
        "UPDATE products SET is_active = 1, updated_at = ? WHERE id = ? AND creator_id = ?"
      )
      .run(nowIso(), id, user.id);

    if (!updateResult.changes) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await writeAuditLog({
      actorUserId: user.id,
      action: "product.activated",
      entityType: "product",
      entityId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
