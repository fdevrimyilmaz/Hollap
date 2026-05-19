import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const patchSchema = z.object({
  role: z.enum(["admin", "creator", "subscriber"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

async function requireAdmin(request: Request) {
  const user = await requireAuth(request);
  if (user.role !== "admin") {
    throw Object.assign(new Error("Yalnızca yöneticiler erişebilir"), { status: 403 });
  }
  return user;
}

export async function PATCH(request: Request, context: Params) {
  try {
    assertCsrf(request);
    await requireAdmin(request);
    const { id } = await context.params;
    const body = await parseJsonBody(request, patchSchema);
    const ts = nowIso();

    if (body.role) {
      await db
        .prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?")
        .run(body.role, ts, id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
