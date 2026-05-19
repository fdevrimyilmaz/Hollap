import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { assertCsrf } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const bodySchema = z.object({
  productId: z.string().trim().min(1).max(128),
});

type BookmarkRow = {
  id: string;
  product_id: string;
  created_at: string;
  product_name: string;
  price_cents: number;
  thumbnail_url: string | null;
  creator_name: string;
};

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    const rows = (await db
      .prepare(
        `SELECT b.id, b.product_id, b.created_at,
                p.name AS product_name, p.price_cents, p.thumbnail_url,
                u.name AS creator_name
         FROM bookmarks b
         JOIN products p ON p.id = b.product_id
         JOIN users u ON u.id = p.creator_id
         WHERE b.user_id = ?
         ORDER BY b.created_at DESC`,
      )
      .all(user.id)) as BookmarkRow[];

    return NextResponse.json({
      bookmarks: rows.map((row) => ({
        id: row.id,
        productId: row.product_id,
        createdAt: row.created_at,
        productName: row.product_name,
        priceCents: row.price_cents,
        thumbnailUrl: row.thumbnail_url,
        creatorName: row.creator_name,
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);
    const body = await parseJsonBody(request, bodySchema);
    const ts = nowIso();

    // Toggle behaviour: if exists → delete, else insert
    const existing = (await db
      .prepare("SELECT id FROM bookmarks WHERE user_id = ? AND product_id = ?")
      .get(user.id, body.productId)) as { id: string } | undefined;

    if (existing) {
      await db.prepare("DELETE FROM bookmarks WHERE id = ?").run(existing.id);
      return NextResponse.json({ bookmarked: false });
    }

    await db
      .prepare(
        "INSERT INTO bookmarks (id, user_id, product_id, created_at) VALUES (?, ?, ?, ?)",
      )
      .run(`bm_${randomUUID()}`, user.id, body.productId, ts);

    return NextResponse.json({ bookmarked: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
