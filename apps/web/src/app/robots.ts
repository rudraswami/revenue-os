import type { MetadataRoute } from "next";
import { GROWVISI_WEB_URL } from "@growvisi/shared";
import { ROBOTS_DISALLOW_PATHS } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: `${GROWVISI_WEB_URL}/sitemap.xml`,
  };
}
