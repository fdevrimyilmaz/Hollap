import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

// Cover images can be larger than avatars; ~2MB limit raw.
const MAX_COVER_BYTES = 3_000_000;

const bodySchema = z.object({
  url: z
    .string()
    .min(1)
    .max(MAX_COVER_BYTES)
    .refine(
      (value) => /^(https?:\/\/|data:image\/(png|jpe?g|webp);base64,)/i.test(value),
      "Geçersiz görsel. Yalnızca http(s) URL veya data:image/<png|jpeg|webp>;base64 desteklenir.",
    )
    .nullable(),
});

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);
    const body = await parseJsonBody(request, bodySchema);
    const ts = nowIso();

    await db
      .prepare("UPDATE users SET cover_url = ?, updated_at = ? WHERE id = ?")
      .run(body.url, ts, user.id);

    return NextResponse.json({ ok: true, coverUrl: body.url });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);
    const ts = nowIso();

    await db
      .prepare("UPDATE users SET cover_url = NULL, updated_at = ? WHERE id = ?")
      .run(ts, user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
