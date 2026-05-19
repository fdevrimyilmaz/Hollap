import type { MetadataRoute } from "next";
import { listCatalogProducts, listCatalogCreators } from "@/lib/server/catalog";
import { resolvePublicBaseUrl } from "@/lib/server/base-url";

export const revalidate = 3600;

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/explore", changeFrequency: "daily", priority: 0.9 },
  { path: "/courses", changeFrequency: "daily", priority: 0.9 },
  { path: "/creators", changeFrequency: "daily", priority: 0.8 },
  { path: "/categories", changeFrequency: "weekly", priority: 0.7 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.6 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.6 },
  { path: "/become-creator", changeFrequency: "monthly", priority: 0.6 },
  { path: "/community", changeFrequency: "weekly", priority: 0.5 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.4 },
  { path: "/help", changeFrequency: "monthly", priority: 0.4 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.4 },
  { path: "/signup", changeFrequency: "yearly", priority: 0.5 },
  { path: "/login", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/cookies", changeFrequency: "yearly", priority: 0.2 },
];

function safeDate(input: string | Date | null | undefined): Date {
  if (!input) return new Date();
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = resolvePublicBaseUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  let productEntries: MetadataRoute.Sitemap = [];
  let creatorEntries: MetadataRoute.Sitemap = [];

  try {
    const [products, creators] = await Promise.all([
      listCatalogProducts({ limit: 5000 }),
      listCatalogCreators({ limit: 2000 }),
    ]);

    productEntries = products.map((product) => ({
      url: `${baseUrl}/course/${product.id}`,
      lastModified: safeDate(product.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    creatorEntries = creators
      .filter((creator) => creator.username)
      .map((creator) => ({
        url: `${baseUrl}/creator/${creator.username}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch (error) {
    console.warn("[sitemap] Failed to load dynamic entries:", error);
  }

  return [...staticEntries, ...productEntries, ...creatorEntries];
}
