import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { consumeRateLimit, getClientIp } from "@/lib/server/security";

const bodySchema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(40),
  productId: z.string().trim().min(1).max(128).optional(),
});

type CouponRow = {
  id: string;
  code: string;
  creator_id: string | null;
  percent_off: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: number;
};

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const limit = await consumeRateLimit({
    key: `coupon:validate:ip:${clientIp}`,
    maxAttempts: 20,
    windowMs: 10 * 60 * 1000,
    blockDurationMs: 30 * 60 * 1000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { valid: false, reason: "Çok fazla deneme yaptınız" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ valid: false, reason: "Geçersiz istek" }, { status: 400 });
  }

  const coupon = (await db
    .prepare("SELECT * FROM coupons WHERE code = ?")
    .get(body.code)) as CouponRow | undefined;

  if (!coupon) {
    return NextResponse.json({ valid: false, reason: "Kupon bulunamadı" });
  }

  if (coupon.active !== 1) {
    return NextResponse.json({ valid: false, reason: "Kupon devre dışı" });
  }

  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ valid: false, reason: "Kuponun süresi doldu" });
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return NextResponse.json({ valid: false, reason: "Kupon kullanım hakkı doldu" });
  }

  // Scope check
  if (coupon.creator_id && body.productId) {
    const product = (await db
      .prepare("SELECT creator_id FROM products WHERE id = ?")
      .get(body.productId)) as { creator_id: string } | undefined;
    if (!product || product.creator_id !== coupon.creator_id) {
      return NextResponse.json({ valid: false, reason: "Bu kupon bu ürün için geçerli değil" });
    }
  }

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    percentOff: coupon.percent_off,
    creatorScoped: Boolean(coupon.creator_id),
  });
}
