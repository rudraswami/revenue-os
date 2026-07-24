import type { MetadataRoute } from "next";
import { GROWVISI_WEB_URL } from "@growvisi/shared";
import {
  INDEXABLE_PATHS,
  sitemapChangeFrequency,
  sitemapPriority,
} from "@/lib/seo";

/** Pre-render at build — stable URL for Google Search Console. */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return INDEXABLE_PATHS.map((path) => ({
    url: path === "/" ? `${GROWVISI_WEB_URL}/` : `${GROWVISI_WEB_URL}${path}`,
    lastModified,
    changeFrequency: sitemapChangeFrequency(path),
    priority: sitemapPriority(path),
  }));
}
