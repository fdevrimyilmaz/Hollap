import { NextResponse } from "next/server";
import { authErrorResponse, requireAuth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  email_verified_at: string | null;
  created_at: string;
};

type ProductRow = {
  id: string;
  name: string;
  creator_name: string;
  price_cents: number;
  sold: number;
  is_active: number;
  created_at: string;
};

type SaleRow = {
  id: string;
  amount_cents: number;
  source: string | null;
  created_at: string;
  buyer_name: string | null;
  creator_name: string | null;
  product_name: string | null;
};

export async function GET(request: Request) {
  try {
    // Only admins can access this endpoint.
    const user = await requireAuth(request);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Yalnızca yöneticiler erişebilir" }, { status: 403 });
    }

    const stats = (await db
      .prepare(
        `SELECT
            (SELECT COUNT(*)::int FROM users) AS total_users,
            (SELECT COUNT(*)::int FROM users WHERE role = 'creator') AS creators,
            (SELECT COUNT(*)::int FROM users WHERE role = 'subscriber') AS subscribers,
            (SELECT COUNT(*)::int FROM products WHERE is_active = 1) AS active_products,
            (SELECT COUNT(*)::int FROM sales) AS sales_count,
            (SELECT COALESCE(SUM(amount_cents), 0)::int FROM sales) AS gross_cents`,
      )
      .get()) as {
      total_users: number;
      creators: number;
      subscribers: number;
      active_products: number;
      sales_count: number;
      gross_cents: number;
    };

    const recentUsers = (await db
      .prepare(
        `SELECT id, name, email, role, email_verified_at, created_at
         FROM users
         ORDER BY created_at DESC
         LIMIT 12`,
      )
      .all()) as UserRow[];

    const products = (await db
      .prepare(
        `SELECT p.id, p.name, u.name AS creator_name, p.price_cents, p.sold, p.is_active, p.created_at
         FROM products p
         JOIN users u ON u.id = p.creator_id
         ORDER BY p.created_at DESC
         LIMIT 12`,
      )
      .all()) as ProductRow[];

    const recentSales = (await db
      .prepare(
        `SELECT s.id, s.amount_cents, s.source, s.created_at,
                buyer.name AS buyer_name, creator.name AS creator_name, p.name AS product_name
         FROM sales s
         LEFT JOIN users buyer ON buyer.id = s.buyer_id
         LEFT JOIN users creator ON creator.id = s.creator_id
         LEFT JOIN products p ON p.id = s.product_id
         ORDER BY s.created_at DESC
         LIMIT 12`,
      )
      .all()) as SaleRow[];

    return NextResponse.json({
      stats,
      recentUsers: recentUsers.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        verified: Boolean(row.email_verified_at),
        createdAt: row.created_at,
      })),
      products: products.map((row) => ({
        id: row.id,
        name: row.name,
        creatorName: row.creator_name,
        priceCents: row.price_cents,
        sold: row.sold,
        isActive: row.is_active === 1,
        createdAt: row.created_at,
      })),
      recentSales: recentSales.map((row) => ({
        id: row.id,
        amountCents: row.amount_cents,
        source: row.source,
        buyer: row.buyer_name,
        creator: row.creator_name,
        product: row.product_name,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
