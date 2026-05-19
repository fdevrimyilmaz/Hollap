import { NextResponse } from "next/server";
import { listCatalogCreators, listCatalogProducts } from "@/lib/server/catalog";
import { consumeRateLimit, getClientIp } from "@/lib/server/security";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  if (q.length === 0) {
    return NextResponse.json({ query: "", products: [], creators: [] });
  }

  const clientIp = getClientIp(request);
  const limit = await consumeRateLimit({
    key: `search:ip:${clientIp}`,
    maxAttempts: 60,
    windowMs: 60 * 1000,
    blockDurationMs: 60 * 1000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { query: q, products: [], creators: [], error: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  try {
    const [products, creators] = await Promise.all([
      listCatalogProducts({ q, limit: 5 }),
      listCatalogCreators({ q, limit: 4 }),
    ]);

    return NextResponse.json({
      query: q,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        creatorName: product.creatorName,
        thumbnail: product.thumbnail,
        amountCents: product.amountCents,
        category: product.category,
      })),
      creators: creators.map((creator) => ({
        id: creator.id,
        name: creator.name,
        username: creator.username,
        profilePath: creator.profilePath,
        avatar: creator.avatar,
        category: creator.category,
        productCount: creator.productCount,
      })),
    });
  } catch (error) {
    console.error("[GET /api/search]", error);
    return NextResponse.json({ query: q, products: [], creators: [] });
  }
}
