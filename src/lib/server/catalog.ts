import { db } from "@/lib/server/db";

type CatalogProductRow = {
  id: string;
  creator_id: string;
  creator_name: string;
  name: string;
  price_cents: number;
  stock: number;
  sold: number;
  is_active: number;
  thumbnail_url: string | null;
  created_at: string;
  review_count?: number | null;
  review_average?: number | null;
};

export type CatalogProduct = {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorSlug: string;
  creatorProfilePath: string;
  creatorAvatar: string;
  name: string;
  description: string;
  amountCents: number;
  stock: number;
  sold: number;
  category: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  rating: number;
  students: number;
  isFeatured: boolean;
  thumbnail: string;
  createdAt: string;
};

type CatalogCreatorRow = {
  id: string;
  name: string;
  created_at: string;
  email_verified_at: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  product_count: number;
  total_sold: number;
  average_product_price_cents: number;
  total_sales_cents: number;
  active_subscribers: number;
  follower_count: number;
  creator_posts: number;
};

type CatalogOverviewRow = {
  total_creators: number;
  total_courses: number;
  total_students: number;
  total_sales_cents: number;
};

export type CatalogCreator = {
  id: string;
  name: string;
  username: string;
  profilePath: string;
  avatar: string;
  coverImage: string;
  bio: string;
  category: string;
  followers: number;
  subscribers: number;
  totalEarningsCents: number;
  rating: number;
  isVerified: boolean;
  subscriptionPriceCents: number;
  productCount: number;
  posts: number;
  createdAt: string;
};

export type CatalogCategory = {
  id: string;
  name: string;
  icon: string;
  count: number;
  color: string;
};

export type CatalogOverview = {
  totalCreators: number;
  totalCourses: number;
  totalStudents: number;
  totalSalesCents: number;
};

const FALLBACK_THUMBNAILS = [
  "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&h=400&fit=crop",
];

const CREATOR_COVER_IMAGES = [
  "https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=1200&h=400&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=400&fit=crop",
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=400&fit=crop",
  "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&h=400&fit=crop",
];

const CATEGORY_COLORS = [
  "from-orange-500 to-amber-500",
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-teal-500",
  "from-pink-500 to-rose-500",
];

const CATEGORY_ICONS = ["briefcase", "code", "palette", "camera"];

const TURKISH_CHAR_MAP: Record<string, string> = {
  c: "c",
  C: "c",
  g: "g",
  G: "g",
  i: "i",
  I: "i",
  o: "o",
  O: "o",
  s: "s",
  S: "s",
  u: "u",
  U: "u",
  "ç": "c",
  "Ç": "c",
  "ğ": "g",
  "Ğ": "g",
  "ı": "i",
  "İ": "i",
  "ö": "o",
  "Ö": "o",
  "ş": "s",
  "Ş": "s",
  "ü": "u",
  "Ü": "u",
};

function isDatabaseUnavailableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as { code?: string }).code;
  if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "ENOTFOUND" || code === "ETIMEDOUT") {
    return true;
  }

  if (
    error.message.includes("DATABASE_URL or DATABASE_URL_PRODUCTION is required in production") ||
    error.message.includes("DATABASE_URL or DATABASE_URL_PREVIEW is required in preview deploys")
  ) {
    return true;
  }

  return error.message.includes("connect ECONNREFUSED");
}

function hashString(input: string): number {
  return input.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function transliterate(input: string): string {
  return input
    .split("")
    .map((char) => TURKISH_CHAR_MAP[char] ?? char)
    .join("");
}

export function toSlug(input: string): string {
  return transliterate(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function toCategoryId(name: string): string {
  return toSlug(name) || "marketplace";
}

export function createCreatorUsername(name: string, creatorId: string): string {
  const base = toSlug(name);
  const suffix = toSlug(creatorId).replace(/[^a-z0-9]/g, "").slice(-6);

  if (!base && !suffix) {
    return "creator";
  }

  if (!base) {
    return `creator-${suffix}`;
  }

  return suffix ? `${base}-${suffix}` : base;
}

function buildCreatorAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f97316&color=ffffff&bold=true`;
}

function pickThumbnail(productId: string): string {
  const hash = hashString(productId);
  return FALLBACK_THUMBNAILS[hash % FALLBACK_THUMBNAILS.length] ?? FALLBACK_THUMBNAILS[0];
}

function pickCreatorCover(creatorId: string): string {
  const hash = hashString(creatorId);
  return CREATOR_COVER_IMAGES[hash % CREATOR_COVER_IMAGES.length] ?? CREATOR_COVER_IMAGES[0];
}

function mapRowToCatalogCreator(row: CatalogCreatorRow): CatalogCreator {
  const username = createCreatorUsername(row.name, row.id);
  const followers = row.follower_count + row.total_sold + row.active_subscribers;
  const rating = Math.min(5, Number((4.4 + Math.min(0.55, row.total_sold / 300)).toFixed(2)));
  const averageProductPrice = Math.max(999, row.average_product_price_cents || 1999);
  const subscriptionPriceCents = Math.max(499, Math.round(averageProductPrice * 0.35));
  const bio =
    row.product_count > 0
      ? `${row.name}, Hollap üzerinde ${row.product_count} aktif ürün yayınlıyor.`
      : `${row.name}, Hollap'ta üreten doğrulanmış bir yaratıcı.`;

  return {
    id: row.id,
    name: row.name,
    username,
    profilePath: `/creator/${username}`,
    avatar: row.avatar_url ?? buildCreatorAvatar(row.name),
    coverImage: row.cover_url ?? pickCreatorCover(row.id),
    bio,
    category: "Marketplace",
    followers,
    subscribers: row.active_subscribers,
    totalEarningsCents: row.total_sales_cents,
    rating,
    isVerified: Boolean(row.email_verified_at) && (row.total_sales_cents > 0 || row.active_subscribers > 0),
    subscriptionPriceCents,
    productCount: row.product_count,
    posts: row.creator_posts,
    createdAt: row.created_at,
  };
}

function mapRowToCatalogProduct(row: CatalogProductRow): CatalogProduct {
  const level: CatalogProduct["level"] =
    row.sold >= 50 ? "Advanced" : row.sold >= 15 ? "Intermediate" : "Beginner";
  const creatorSlug = createCreatorUsername(row.creator_name, row.creator_id);

  // Real review average if there are reviews; otherwise estimate from sales velocity.
  const reviewCount = row.review_count ?? 0;
  const reviewAverage = row.review_average ?? 0;
  const rating = reviewCount > 0
    ? Number(reviewAverage.toFixed(2))
    : Math.min(5, Number((4.5 + Math.min(0.45, row.sold / 500)).toFixed(2)));

  return {
    id: row.id,
    creatorId: row.creator_id,
    creatorName: row.creator_name,
    creatorSlug,
    creatorProfilePath: `/creator/${creatorSlug}`,
    creatorAvatar: buildCreatorAvatar(row.creator_name),
    name: row.name,
    description: `${row.name} — Hollap üzerinden hemen satın alabilirsin.`,
    amountCents: row.price_cents,
    stock: row.stock,
    sold: row.sold,
    category: "Marketplace",
    level,
    duration: `${Math.max(4, Math.min(48, Math.round(row.price_cents / 180)))} saat`,
    rating,
    students: Math.max(1, row.sold * 3 + 25),
    isFeatured: row.sold >= 10,
    thumbnail: row.thumbnail_url ?? pickThumbnail(row.id),
    createdAt: row.created_at,
  };
}

export async function listCatalogProducts(params?: {
  q?: string;
  limit?: number;
  includeInactive?: boolean;
  includeOutOfStock?: boolean;
  creatorId?: string;
  category?: string;
}): Promise<CatalogProduct[]> {
  const requestedCategory = params?.category?.trim();
  if (requestedCategory && requestedCategory.toLowerCase() !== "marketplace") {
    return [];
  }

  const args: Array<string | number> = [];
  const conditions: string[] = [];
  const q = params?.q?.trim();

  if (!params?.includeInactive) {
    conditions.push("p.is_active = 1");
  }

  if (!params?.includeOutOfStock) {
    conditions.push("p.stock > 0");
  }

  if (q) {
    conditions.push("(LOWER(p.name) LIKE LOWER(?) OR LOWER(u.name) LIKE LOWER(?))");
    const keyword = `%${q}%`;
    args.push(keyword, keyword);
  }

  if (params?.creatorId) {
    conditions.push("p.creator_id = ?");
    args.push(params.creatorId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limitClause = params?.limit ? "LIMIT ?" : "";

  if (params?.limit) {
    args.push(Math.max(1, Math.floor(params.limit)));
  }

  try {
    const rows = await db
      .prepare(
        `
          SELECT
            p.id,
            p.creator_id,
            u.name as creator_name,
            p.name,
            p.price_cents,
            p.stock,
            p.sold,
            p.is_active,
            p.thumbnail_url,
            p.created_at,
            COALESCE(r.review_count, 0)::int AS review_count,
            COALESCE(r.review_average, 0)::float AS review_average
          FROM products p
          JOIN users u ON u.id = p.creator_id
          LEFT JOIN (
            SELECT product_id, COUNT(*) AS review_count, AVG(rating) AS review_average
            FROM course_reviews
            GROUP BY product_id
          ) r ON r.product_id = p.id
          ${whereClause}
          ORDER BY p.created_at DESC
          ${limitClause}
        `
      )
      .all(...args) as CatalogProductRow[];

    return rows.map(mapRowToCatalogProduct);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getCatalogProductById(
  productId: string,
  options?: { includeInactive?: boolean }
): Promise<CatalogProduct | null> {
  let row: CatalogProductRow | undefined;

  try {
    row = await db
      .prepare(
        `
          SELECT
            p.id,
            p.creator_id,
            u.name as creator_name,
            p.name,
            p.price_cents,
            p.stock,
            p.sold,
            p.is_active,
            p.thumbnail_url,
            p.created_at,
            COALESCE(r.review_count, 0)::int AS review_count,
            COALESCE(r.review_average, 0)::float AS review_average
          FROM products p
          JOIN users u ON u.id = p.creator_id
          LEFT JOIN (
            SELECT product_id, COUNT(*) AS review_count, AVG(rating) AS review_average
            FROM course_reviews
            GROUP BY product_id
          ) r ON r.product_id = p.id
          WHERE p.id = ?
        `
      )
      .get(productId) as CatalogProductRow | undefined;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return null;
    }
    throw error;
  }

  if (!row) {
    return null;
  }

  if (!options?.includeInactive && !row.is_active) {
    return null;
  }

  return mapRowToCatalogProduct(row);
}

export async function listCatalogCreators(params?: {
  q?: string;
  limit?: number;
}): Promise<CatalogCreator[]> {
  const args: Array<string | number> = [];
  const conditions: string[] = ["u.role = 'creator'"];
  const q = params?.q?.trim();

  if (q) {
    const keyword = `%${q}%`;
    conditions.push(
      `(
        LOWER(u.name) LIKE LOWER(?)
        OR EXISTS (
          SELECT 1
          FROM products p
          WHERE p.creator_id = u.id
            AND LOWER(p.name) LIKE LOWER(?)
        )
      )`
    );
    args.push(keyword, keyword);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limitClause = params?.limit ? "LIMIT ?" : "";

  if (params?.limit) {
    args.push(Math.max(1, Math.floor(params.limit)));
  }

  try {
    const rows = await db
      .prepare(
        `
          SELECT
            u.id,
            u.name,
            u.created_at,
            u.email_verified_at,
            u.avatar_url,
            u.cover_url,
            COALESCE(prod.product_count, 0) as product_count,
            COALESCE(prod.total_sold, 0) as total_sold,
            COALESCE(prod.average_product_price_cents, 0) as average_product_price_cents,
            COALESCE(sales.total_sales_cents, 0) as total_sales_cents,
            COALESCE(subs.active_subscribers, 0) as active_subscribers,
            COALESCE(followers.follower_count, 0) as follower_count,
            COALESCE(dm.creator_posts, 0) as creator_posts
          FROM users u
          LEFT JOIN (
            SELECT
              creator_id,
              COUNT(*) as product_count,
              COALESCE(SUM(sold), 0) as total_sold,
              COALESCE(CAST(ROUND(AVG(price_cents)) AS INTEGER), 0) as average_product_price_cents
            FROM products
            WHERE is_active = 1
            GROUP BY creator_id
          ) prod ON prod.creator_id = u.id
          LEFT JOIN (
            SELECT
              creator_id,
              COALESCE(SUM(amount_cents), 0) as total_sales_cents
            FROM sales
            GROUP BY creator_id
          ) sales ON sales.creator_id = u.id
          LEFT JOIN (
            SELECT
              creator_id,
              COUNT(*) as active_subscribers
            FROM subscriptions
            WHERE active = 1
              AND LOWER(COALESCE(stripe_status, '')) IN ('active', 'trialing')
              AND (current_period_end IS NULL OR current_period_end::timestamptz > NOW())
            GROUP BY creator_id
          ) subs ON subs.creator_id = u.id
          LEFT JOIN (
            SELECT
              creator_id,
              COUNT(DISTINCT buyer_id) as follower_count
            FROM sales
            GROUP BY creator_id
          ) followers ON followers.creator_id = u.id
          LEFT JOIN (
            SELECT
              sender_id,
              COUNT(*) as creator_posts
            FROM dm_messages
            GROUP BY sender_id
          ) dm ON dm.sender_id = u.id
          ${whereClause}
          ORDER BY active_subscribers DESC, total_sales_cents DESC, product_count DESC, u.created_at DESC
          ${limitClause}
        `
      )
      .all(...args) as CatalogCreatorRow[];

    return rows.map(mapRowToCatalogCreator);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getCatalogCreatorByHandle(handle: string): Promise<CatalogCreator | null> {
  const normalizedHandle = handle.trim().toLowerCase();
  if (!normalizedHandle) {
    return null;
  }

  const creators = await listCatalogCreators();
  return (
    creators.find((creator) =>
      creator.id.toLowerCase() === normalizedHandle ||
      creator.username.toLowerCase() === normalizedHandle
    ) ?? null
  );
}

export async function listCatalogCategories(): Promise<CatalogCategory[]> {
  const products = await listCatalogProducts();
  const counts = new Map<string, number>();

  for (const product of products) {
    const current = counts.get(product.category) ?? 0;
    counts.set(product.category, current + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "tr"))
    .map(([name, count]) => {
      const hash = hashString(name);
      return {
        id: toCategoryId(name),
        name,
        icon: CATEGORY_ICONS[hash % CATEGORY_ICONS.length] ?? CATEGORY_ICONS[0],
        count,
        color: CATEGORY_COLORS[hash % CATEGORY_COLORS.length] ?? CATEGORY_COLORS[0],
      };
    });
}

export async function getCatalogOverview(): Promise<CatalogOverview> {
  try {
    const row = await db
      .prepare(
        `
          SELECT
            COALESCE((SELECT COUNT(*) FROM users WHERE role = 'creator'), 0) as total_creators,
            COALESCE((SELECT COUNT(*) FROM products WHERE is_active = 1 AND stock > 0), 0) as total_courses,
            COALESCE((SELECT SUM(sold) FROM products WHERE is_active = 1), 0) as total_students,
            COALESCE((SELECT SUM(amount_cents) FROM sales), 0) as total_sales_cents
        `
      )
      .get() as CatalogOverviewRow | undefined;

    if (!row) {
      return {
        totalCreators: 0,
        totalCourses: 0,
        totalStudents: 0,
        totalSalesCents: 0,
      };
    }

    return {
      totalCreators: row.total_creators,
      totalCourses: row.total_courses,
      totalStudents: row.total_students,
      totalSalesCents: row.total_sales_cents,
    };
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return {
        totalCreators: 0,
        totalCourses: 0,
        totalStudents: 0,
        totalSalesCents: 0,
      };
    }
    throw error;
  }
}
