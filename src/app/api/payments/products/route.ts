import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";

export async function GET() {
  const products = await db
    .prepare(
      `
        SELECT p.id, p.name, p.price_cents, p.stock, u.name as creator_name
        FROM products p
        JOIN users u ON u.id = p.creator_id
        WHERE p.is_active = 1 AND p.stock > 0
        ORDER BY p.created_at DESC
      `
    )
    .all() as Array<{
      id: string;
      name: string;
      price_cents: number;
      stock: number;
      creator_name: string;
    }>;

  return NextResponse.json({
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      amountCents: product.price_cents,
      stock: product.stock,
      creatorName: product.creator_name,
    })),
  });
}
