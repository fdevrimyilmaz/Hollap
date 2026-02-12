import { db } from "@/lib/server/db";
import { listCreatorLiveSessions } from "@/lib/server/live";
import { listDmOrdersForCreator } from "@/lib/server/dm";
import {
  calculateCreatorNetCents,
  calculatePlatformCommissionCents,
  CREATOR_REVENUE_SHARE_PERCENT,
  PLATFORM_COMMISSION_PERCENT,
} from "@/lib/server/revenue";

function formatCurrencyFromCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / (60 * 1000));

  if (minutes < 1) {
    return "simdi";
  }

  if (minutes < 60) {
    return `${minutes} dk once`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} saat once`;
  }

  const days = Math.floor(hours / 24);
  return `${days} gun once`;
}

export async function getCreatorDashboard(creatorId: string): Promise<{
  stats: Array<{ label: string; value: string; change: string }>;
  recentSales: Array<{ name: string; product: string; amount: string; time: string }>;
  liveSessions: Array<{
    id: string;
    title: string;
    schedule: string;
    booked: number;
    total: number;
    isLive: boolean;
    streamKeyAvailable: boolean;
    playbackUrl: string | null;
  }>;
  products: Array<{ id: string; name: string; price: number; stock: number; sold: number; isActive: boolean }>;
  dmOrders: Array<{
    id: string;
    buyer: string;
    productId: string;
    productName: string;
    amount: string;
    status: string;
    paymentLinkUrl: string | null;
  }>;
  sentFilesLog: Array<{ filesCount: number; audience: string; time: string }>;
}> {
  const totals = await db
    .prepare(
      `
        SELECT
          COALESCE(SUM(amount_cents), 0) as gross_sales_cents,
          COUNT(*) as sales_count
        FROM sales
        WHERE creator_id = ?
      `
    )
    .get(creatorId) as { gross_sales_cents: number; sales_count: number };

  const subscriberCount = await db
    .prepare(
      "SELECT COUNT(*) as count FROM subscriptions WHERE creator_id = ? AND stripe_status IN ('active', 'trialing')"
    )
    .get(creatorId) as { count: number };

  const recentSalesRows = await db
    .prepare(
      `
        SELECT s.amount_cents, s.created_at, u.name as buyer_name, p.name as product_name
        FROM sales s
        JOIN users u ON u.id = s.buyer_id
        JOIN products p ON p.id = s.product_id
        WHERE s.creator_id = ?
        ORDER BY s.created_at DESC
        LIMIT 6
      `
    )
    .all(creatorId) as Array<{
      amount_cents: number;
      created_at: string;
      buyer_name: string;
      product_name: string;
    }>;

  const products = await db
    .prepare(
      `
        SELECT id, name, price_cents, stock, sold, is_active
        FROM products
        WHERE creator_id = ?
        ORDER BY created_at DESC
      `
    )
    .all(creatorId) as Array<{
      id: string;
      name: string;
      price_cents: number;
      stock: number;
      sold: number;
      is_active: number;
    }>;

  const dispatches = await db
    .prepare(
      `
        SELECT files_count, audience, created_at
        FROM file_dispatches
        WHERE creator_id = ?
        ORDER BY created_at DESC
        LIMIT 3
      `
    )
    .all(creatorId) as Array<{ files_count: number; audience: string; created_at: string }>;

  const dmOrders = (await listDmOrdersForCreator(creatorId)).map((order) => ({
    id: order.id,
    buyer: order.buyerName,
    productId: order.productId,
    productName: order.productName,
    amount: formatCurrencyFromCents(order.amountCents),
    status: order.status,
    paymentLinkUrl: order.paymentLinkUrl,
  }));

  const platformCommissionCents = calculatePlatformCommissionCents(totals.gross_sales_cents);
  const creatorNetEarningsCents = calculateCreatorNetCents(totals.gross_sales_cents);

  return {
    stats: [
      {
        label: `Toplam Kazanc (Net %${CREATOR_REVENUE_SHARE_PERCENT})`,
        value: formatCurrencyFromCents(creatorNetEarningsCents),
        change: "+12%",
      },
      {
        label: "Toplam Abone",
        value: `${subscriberCount.count}`,
        change: "+6%",
      },
      {
        label: "Kurs Satisi",
        value: `${totals.sales_count}`,
        change: "+9%",
      },
      {
        label: `Platform Komisyonu (%${PLATFORM_COMMISSION_PERCENT})`,
        value: formatCurrencyFromCents(platformCommissionCents),
        change: "+20%",
      },
    ],
    recentSales: recentSalesRows.map((sale) => ({
      name: sale.buyer_name,
      product: sale.product_name,
      amount: formatCurrencyFromCents(sale.amount_cents),
      time: formatTimeAgo(sale.created_at),
    })),
    liveSessions: await listCreatorLiveSessions(creatorId),
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price_cents / 100,
      stock: product.stock,
      sold: product.sold,
      isActive: Boolean(product.is_active),
    })),
    dmOrders,
    sentFilesLog: dispatches.map((item) => ({
      filesCount: item.files_count,
      audience: item.audience,
      time: formatTimeAgo(item.created_at),
    })),
  };
}
