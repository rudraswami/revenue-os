import type { Metadata } from "next";
import { GROWVISI_WEB_URL } from "@growvisi/shared";
import { PRODUCT_SLUGS } from "@/lib/product-pages";
import { SOLUTION_SLUGS } from "@/lib/solution-pages";

export const SITE_NAME = "Growvisi";

export const DEFAULT_SITE_TITLE = "Growvisi — Always know whose turn it is on WhatsApp";

export const DEFAULT_SITE_DESCRIPTION =
  "WhatsApp conversations in. Pipeline ₹ out. AI classifies every lead — YOUR TURN when a human should reply. 14-day trial, INR via Razorpay.";

export const OG_IMAGE_PATH = "/opengraph-image";

/** Public marketing URLs included in sitemap.xml */
export const INDEXABLE_PATHS = [
  "/",
  "/pricing",
  "/about",
  "/contact",
  "/demo",
  "/agencies",
  "/privacy",
  "/terms",
  "/cookies",
  "/dpa",
  "/data-deletion",
  ...PRODUCT_SLUGS.map((slug) => `/product/${slug}`),
  ...SOLUTION_SLUGS.map((slug) => `/solutions/${slug}`),
] as const;

/** Paths blocked in robots.txt — app, auth, internal previews */
export const ROBOTS_DISALLOW_PATHS = [
  "/dashboard/",
  "/onboarding",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/signup",
  "/invite",
  "/verify-email",
  "/design",
  "/data-deletion/status",
] as const;

export function canonicalUrl(path: string): string {
  if (!path || path === "/") return GROWVISI_WEB_URL;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${GROWVISI_WEB_URL}${normalized}`;
}

export function buildPageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  ogDescription?: string;
  noIndex?: boolean;
}): Metadata {
  const url = canonicalUrl(opts.path);
  const ogTitle = opts.ogTitle ?? opts.title;
  const ogDescription = opts.ogDescription ?? opts.description;

  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: ogTitle,
      description: ogDescription,
      locale: "en_IN",
      images: [{ url: OG_IMAGE_PATH, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [OG_IMAGE_PATH],
    },
    ...(opts.noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}

export const NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false },
};

export function sitemapPriority(path: string): number {
  if (path === "/") return 1;
  if (path === "/pricing") return 0.9;
  if (path.startsWith("/product/") || path.startsWith("/solutions/")) return 0.8;
  if (path === "/contact" || path === "/demo" || path === "/agencies") return 0.7;
  if (path === "/about") return 0.6;
  return 0.3;
}

export function sitemapChangeFrequency(
  path: string,
): "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never" {
  if (path === "/") return "weekly";
  if (path === "/pricing" || path.startsWith("/product/") || path.startsWith("/solutions/")) {
    return "monthly";
  }
  if (
    path === "/privacy" ||
    path === "/terms" ||
    path === "/cookies" ||
    path === "/dpa" ||
    path === "/data-deletion"
  ) {
    return "yearly";
  }
  return "monthly";
}
