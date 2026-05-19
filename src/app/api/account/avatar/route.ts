import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

// Cap base64 data URLs at ~800KB raw (encoded ~1.07MB) — covers most PNG/JPEG avatars.
const MAX_DATA_URL_BYTES = 1_200_000;

const bodySchema = z.object({
  // Either a public URL or a data: URL.
  url: z
    .string()
    .min(1)
    .max(MAX_DATA_URL_BYTES)
    .refine(
      (value) => /^(https?:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(value),
      "Geçersiz resim URL'i. Yalnızca http(s) veya data:image/<png|jpeg|webp|gif>;base64 desteklenir.",
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
      .prepare("UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?")
      .run(body.url, ts, user.id);

    return NextResponse.json({ ok: true, avatarUrl: body.url });
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
      .prepare("UPDATE users SET avatar_url = NULL, updated_at = ? WHERE id = ?")
      .run(ts, user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
