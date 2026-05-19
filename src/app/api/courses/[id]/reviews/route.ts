import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db, nowIso } from "@/lib/server/db";
import { assertCsrf, consumeRateLimit } from "@/lib/server/security";
import { parseJsonBody } from "@/lib/server/validation";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().or(z.literal("")).transform((v) => (v ? v : null)),
});

type Params = { params: Promise<{ id: string }> };

function resolveProductId(raw: string): string {
  return raw.startsWith("prd_") || raw.startsWith("prd-") ? raw : `prd_${raw}`;
}

export async function GET(_request: Request, context: Params) {
  const { id } = await context.params;
  const productId = resolveProductId(id);

  try {
    const rows = (await db
      .prepare(
        `SELECT r.id, r.rating, r.comment, r.created_at, r.user_id, u.name AS user_name, u.avatar_url
         FROM course_reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.product_id = ?
         ORDER BY r.created_at DESC
         LIMIT 100`,
      )
      .all(productId)) as Array<{
        id: string;
        rating: number;
        comment: string | null;
        created_at: string;
        user_id: string;
        user_name: string;
        avatar_url: string | null;
      }>;

    const summary = (await db
      .prepare(
        `SELECT COUNT(*)::int AS total, COALESCE(AVG(rating), 0)::float AS average
         FROM course_reviews
         WHERE product_id = ?`,
      )
      .get(productId)) as { total: number; average: number };

    return NextResponse.json({
      summary: {
        total: summary.total,
        average: Number(summary.average.toFixed(2)),
      },
      reviews: rows.map((row) => ({
        id: row.id,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at,
        user: {
          id: row.user_id,
          name: row.user_name,
          avatarUrl: row.avatar_url,
        },
      })),
    });
  } catch (error) {
    console.error("[GET reviews]", error);
    return NextResponse.json({ summary: { total: 0, average: 0 }, reviews: [] });
  }
}

export async function POST(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);

    const limit = await consumeRateLimit({
      key: `reviews:write:${user.id}`,
      maxAttempts: 10,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla yorum gönderdiniz. Lütfen bir süre sonra tekrar deneyin." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        }
      );
    }

    const { id } = await context.params;
    const productId = resolveProductId(id);
    const body = await parseJsonBody(request, reviewSchema);
    const ts = nowIso();

    // Verify product exists
    const product = (await db
      .prepare("SELECT id FROM products WHERE id = ?")
      .get(productId)) as { id: string } | undefined;
    if (!product) {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    // Upsert by (product_id, user_id)
    const existing = (await db
      .prepare("SELECT id FROM course_reviews WHERE product_id = ? AND user_id = ?")
      .get(productId, user.id)) as { id: string } | undefined;

    if (existing) {
      await db
        .prepare(
          "UPDATE course_reviews SET rating = ?, comment = ?, updated_at = ? WHERE id = ?",
        )
        .run(body.rating, body.comment, ts, existing.id);
      return NextResponse.json({ ok: true, reviewId: existing.id, updated: true });
    }

    const reviewId = `rev_${randomUUID()}`;
    await db
      .prepare(
        `INSERT INTO course_reviews (id, product_id, user_id, rating, comment, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(reviewId, productId, user.id, body.rating, body.comment, ts, ts);

    return NextResponse.json({ ok: true, reviewId, updated: false });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: Params) {
  try {
    assertCsrf(request);
    const user = await requireAuth(request);
    const { id } = await context.params;
    const productId = resolveProductId(id);

    await db
      .prepare("DELETE FROM course_reviews WHERE product_id = ? AND user_id = ?")
      .run(productId, user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
