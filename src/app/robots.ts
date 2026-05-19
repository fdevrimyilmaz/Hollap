import type { MetadataRoute } from "next";
import { resolvePublicBaseUrl } from "@/lib/server/base-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = resolvePublicBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/admin/",
          "/checkout",
          "/watch/",
          "/certificate/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
