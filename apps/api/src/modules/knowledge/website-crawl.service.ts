import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as cheerio from "cheerio";
import { fetchWithTimeout } from "../../common/http/fetch-with-timeout";

const MAX_PAGES = 30;
const CRAWL_TIMEOUT_MS = 12_000;
const MAX_DEPTH = 3;

/** Common business pages — seeded for SPAs with no <a> tags in initial HTML. */
const COMMON_BUSINESS_PATHS = [
  "/pricing",
  "/plans",
  "/about",
  "/about-us",
  "/contact",
  "/contact-us",
  "/faq",
  "/faqs",
  "/services",
  "/products",
  "/features",
];

export interface CrawledPage {
  url: string;
  title: string;
  /** Main text content extracted from the page. */
  text: string;
  /** Links found on this page (same-origin only). */
  links: string[];
  /** Meta description if available. */
  description: string | null;
}

export interface CrawlResult {
  pages: CrawledPage[];
  baseUrl: string;
  siteName: string | null;
  error: string | null;
}

@Injectable()
export class WebsiteCrawlService {
  private readonly logger = new Logger(WebsiteCrawlService.name);

  constructor(private readonly config: ConfigService) {}

  async crawl(url: string): Promise<CrawlResult> {
    const parsed = this.normalizeUrl(url);
    if (!parsed) {
      return { pages: [], baseUrl: url, siteName: null, error: "Invalid URL" };
    }

    const visited = new Set<string>();
    const queue: Array<{ url: string; depth: number }> = [{ url: parsed.href, depth: 0 }];
    const pages: CrawledPage[] = [];
    let siteName: string | null = null;

    while (queue.length > 0 && pages.length < MAX_PAGES) {
      const item = queue.shift()!;
      const canonical = this.canonicalize(item.url);
      if (visited.has(canonical) || item.depth > MAX_DEPTH) continue;
      visited.add(canonical);

      try {
        const page = await this.fetchAndParse(item.url, parsed.origin);
        if (!page) continue;

        if (!siteName && pages.length === 0) {
          siteName = page.title.split(/[|–—-]/).pop()?.trim() ?? null;
        }

        pages.push(page);

        if (item.depth < MAX_DEPTH) {
          const linksToFollow = [...page.links];

          // SPAs (Next.js App Router, etc.) often have zero <a> tags in HTML.
          // Seed common business paths so we pick up /pricing, /about, etc.
          if (item.depth === 0 && linksToFollow.length < 4) {
            for (const path of COMMON_BUSINESS_PATHS) {
              const seeded = new URL(path, parsed.origin).href;
              if (!linksToFollow.includes(seeded)) linksToFollow.push(seeded);
            }
          }

          for (const link of linksToFollow) {
            const linkCanonical = this.canonicalize(link);
            if (!visited.has(linkCanonical) && pages.length + queue.length < MAX_PAGES * 2) {
              queue.push({ url: link, depth: item.depth + 1 });
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.debug(`Skipping ${item.url}: ${msg}`);
      }
    }

    return {
      pages,
      baseUrl: parsed.origin,
      siteName,
      error: pages.length === 0 ? "Could not crawl any pages from this website" : null,
    };
  }

  private async fetchAndParse(url: string, origin: string): Promise<CrawledPage | null> {
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; GrowvisiBot/1.0; +https://growvisi.com/bot)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      },
      CRAWL_TIMEOUT_MS,
    );

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return null;
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $("title").text().trim() || $("h1").first().text().trim() || url;
    const description =
      $('meta[name="description"]').attr("content")?.trim() ??
      $('meta[property="og:description"]').attr("content")?.trim() ??
      null;

    // Extract links BEFORE removing elements — merge anchor tags + RSC payload hrefs
    const anchorLinks = this.extractSameOriginLinks($, url, origin);
    const rscLinks = this.extractRscLinks(html, origin);
    const links = [...new Set([...anchorLinks, ...rscLinks])];

    // Extract SPA data BEFORE stripping scripts (Next.js, Nuxt, JSON-LD)
    const spaText = this.extractSpaContent(html, $);

    // Now remove non-content elements for standard extraction
    $("script, style, noscript, iframe, svg").remove();
    $("[aria-hidden='true']").remove();
    $(".cookie-banner, .popup, .modal, #cookie-consent").remove();

    const mainContent = $("main, article, [role='main'], .content, .page-content, #content");
    const textSource = mainContent.length > 0 ? mainContent : $("body");

    let text = this.extractCleanText($, textSource);

    // If standard extraction got too little, use SPA-extracted content
    if (text.length < 200 && spaText.length > text.length) {
      this.logger.debug(
        `[Crawl] Standard extraction: ${text.length} chars, SPA extraction: ${spaText.length} chars — using SPA content for ${url}`,
      );
      text = spaText;
    }

    // Minimum viable content threshold
    if (text.length < 30) return null;

    return { url, title, text, links, description };
  }

  /**
   * Extract text content from SPA frameworks that render client-side.
   * Handles: Next.js (Pages + App Router), Nuxt, JSON-LD, meta tags.
   */
  private extractSpaContent(html: string, $: cheerio.CheerioAPI): string {
    const parts: string[] = [];

    // 1. Meta tags — always available, even on SPAs
    const metaDesc =
      $('meta[name="description"]').attr("content")?.trim() ??
      $('meta[property="og:description"]').attr("content")?.trim();
    const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
    if (ogTitle) parts.push(`# ${ogTitle}`);
    if (metaDesc) parts.push(metaDesc);

    // Extra meta content (twitter, keywords)
    const twitterDesc = $('meta[name="twitter:description"]').attr("content")?.trim();
    if (twitterDesc && twitterDesc !== metaDesc) parts.push(twitterDesc);
    const keywords = $('meta[name="keywords"]').attr("content")?.trim();
    if (keywords) parts.push(`Keywords: ${keywords}`);

    // 2. JSON-LD structured data — rich machine-readable content
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).text());
        const ldText = this.extractJsonLdText(json);
        if (ldText) parts.push(ldText);
      } catch {
        // Invalid JSON-LD
      }
    });

    // 3. Next.js Pages Router — __NEXT_DATA__
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (nextDataMatch) {
      try {
        const data = JSON.parse(nextDataMatch[1]);
        const nextText = this.extractNextDataText(data);
        if (nextText) parts.push(nextText);
      } catch {
        // Invalid __NEXT_DATA__
      }
    }

    // 4. Next.js App Router — RSC payload (self.__next_f.push)
    const rscTexts = this.extractRscText(html);
    if (rscTexts.length > 0) parts.push(rscTexts.join("\n\n"));

    // 5. RSC children strings — nav labels, headings, body copy embedded in JSON
    const childTexts = this.extractRscChildrenText(html);
    if (childTexts.length > 0) parts.push(childTexts.join("\n"));

    // 6. Nuxt.js — window.__NUXT__
    const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
    if (nuxtMatch) {
      const nuxtText = this.extractStringValues(nuxtMatch[1]);
      if (nuxtText) parts.push(nuxtText);
    }

    return parts.join("\n\n").slice(0, 15_000);
  }

  /** Extract readable text from JSON-LD structured data. */
  private extractJsonLdText(json: unknown): string | null {
    if (!json || typeof json !== "object") return null;
    const parts: string[] = [];
    const obj = json as Record<string, unknown>;

    const textFields = [
      "name", "description", "headline", "articleBody", "text",
      "streetAddress", "addressLocality", "telephone", "email",
      "openingHours", "priceRange", "servesCuisine",
    ];
    for (const field of textFields) {
      const val = obj[field];
      if (typeof val === "string" && val.length > 5) {
        parts.push(`${field}: ${val}`);
      }
    }

    // Recurse into arrays and objects
    if (Array.isArray(json)) {
      for (const item of json) {
        const t = this.extractJsonLdText(item);
        if (t) parts.push(t);
      }
    } else {
      for (const val of Object.values(obj)) {
        if (typeof val === "object" && val !== null) {
          const t = this.extractJsonLdText(val);
          if (t) parts.push(t);
        }
      }
    }

    return parts.length > 0 ? parts.join("\n") : null;
  }

  /** Extract text from Next.js Pages Router __NEXT_DATA__. */
  private extractNextDataText(data: unknown): string | null {
    if (!data || typeof data !== "object") return null;
    const root = data as Record<string, unknown>;
    const props = root.props as Record<string, unknown> | undefined;
    const pageProps = props?.pageProps as Record<string, unknown> | undefined;
    if (!pageProps) return null;

    return this.extractStringValues(JSON.stringify(pageProps));
  }

  /** Extract same-origin links embedded in Next.js / React RSC payloads. */
  private extractRscLinks(html: string, origin: string): string[] {
    const links: string[] = [];
    const seen = new Set<string>();
    const sources = this.getRscSources(html);

    for (const source of sources) {
      for (const match of source.matchAll(/"href":"(\/[^"#?\\]+)"/g)) {
        const path = match[1];
        if (this.shouldSkipPath(path)) continue;
        try {
          const absolute = new URL(path, origin);
          absolute.hash = "";
          const clean = absolute.href;
          if (!seen.has(clean)) {
            seen.add(clean);
            links.push(clean);
          }
        } catch {
          // Invalid URL
        }
      }
    }

    return links;
  }

  /** Extract user-facing text from RSC `children` JSON properties. */
  private extractRscChildrenText(html: string): string[] {
    const texts: string[] = [];
    const seen = new Set<string>();

    for (const source of this.getRscSources(html)) {
      for (const match of source.matchAll(/"children":"([^"]{5,})"/g)) {
        const text = match[1].replace(/\\n/g, "\n").trim();
        if (this.isRscNoise(text)) continue;
        if (seen.has(text)) continue;
        seen.add(text);
        texts.push(text);
      }
    }

    return texts;
  }

  /** Decode and collect all RSC chunk sources from HTML. */
  private getRscSources(html: string): string[] {
    const sources = [html];
    for (const [, raw] of html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)) {
      sources.push(this.decodeRscChunk(raw));
    }
    return sources;
  }

  private decodeRscChunk(raw: string): string {
    return raw.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }

  /** Filter React/Next.js internals, CSS classes, and code fragments. */
  private isRscNoise(text: string): boolean {
    if (/^(static\/chunks|__variable|webpack|next\/static|\/_next\/)/.test(text)) return true;
    if (/^(flex|grid|mt-|px-|py-|text-|bg-|border|rounded|inline-flex|min-h-|max-w-|items-|justify-)/.test(text))
      return true;
    if (/^(Element|Function|Object|Array|import|export|const|let|var|class)\b/.test(text)) return true;
    if (/react|fragment|Boundary|Metadata|Viewport|Outlet|Suspense|ClientPage|AsyncMetadata/i.test(text))
      return true;
    if (/^[\$#@]|^\d+:|^I\[|^:\w/.test(text)) return true;
    if (text.length > 150 && /className|children|templateScripts/.test(text)) return true;
    if (/Page not found|doesn't exist or has been moved/i.test(text)) return true;
    return false;
  }

  private shouldSkipPath(pathname: string): boolean {
    if (/\.(pdf|jpg|jpeg|png|gif|svg|mp4|zip|doc|docx|woff2?|css|js|json|ico|webp|map)$/i.test(pathname))
      return true;
    if (
      /\/(login|signup|register|auth|admin|cart|checkout|dashboard|api|_next|privacy|terms|cookies|cookie|dpa|gdpr|legal|data-deletion|disclaimer)/i.test(
        pathname,
      )
    )
      return true;
    if (pathname.startsWith("/#") || pathname === "#") return true;
    return false;
  }

  /** Extract readable text from RSC streaming payload. */
  private extractRscText(html: string): string[] {
    const texts: string[] = [];
    const seen = new Set<string>();

    for (const source of this.getRscSources(html)) {
      const matches = source.match(
        /[A-Z\u0900-\u097F₹][a-zA-Z\u0900-\u097F0-9\s,.\-—₹:;!?'&/()%+]{12,}/g,
      );
      if (!matches) continue;

      for (const m of matches) {
        const trimmed = m.trim();
        if (this.isRscNoise(trimmed)) continue;
        if (seen.has(trimmed)) continue;
        seen.add(trimmed);
        texts.push(trimmed);
      }
    }

    return texts;
  }

  /** Pull readable strings from a JSON-like blob, filtering noise. */
  private extractStringValues(blob: string): string | null {
    const strings: string[] = [];
    const matches = blob.match(/"([^"]{15,500})"/g);
    if (!matches) return null;

    const seen = new Set<string>();
    for (const m of matches) {
      const val = m.slice(1, -1);
      // Skip URLs, paths, hashes, code
      if (/^(https?:|\/|#|data:|\\u)/.test(val)) continue;
      if (/[{}<>]|function\s|=>|\.js$|\.css$/.test(val)) continue;
      if (val.split(/\s+/).length < 3) continue;
      if (seen.has(val)) continue;
      seen.add(val);
      strings.push(val.replace(/\\n/g, "\n").replace(/\\"/g, '"'));
    }

    return strings.length > 0 ? strings.join("\n\n") : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractCleanText($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string {
    const blocks: string[] = [];
    const seen = new Set<string>();

    // First pass: structured elements for proper formatting
    el.find("h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, dt, dd, address").each(
      (_, elem) => {
        const tag = (elem as { tagName?: string }).tagName?.toLowerCase() ?? "";
        const text = $(elem).text().replace(/\s+/g, " ").trim();
        if (!text || text.length < 3) return;
        if (seen.has(text)) return;
        seen.add(text);

        if (tag.startsWith("h")) {
          const level = parseInt(tag[1], 10);
          blocks.push(`${"#".repeat(level)} ${text}`);
        } else if (tag === "li") {
          blocks.push(`- ${text}`);
        } else {
          blocks.push(text);
        }
      },
    );

    // Fallback: if structured extraction got too little, extract ALL visible text
    if (blocks.join("\n").length < 100) {
      const rawText = el.text().replace(/\s+/g, " ").trim();
      if (rawText.length > 50) {
        return rawText.slice(0, 15_000);
      }
    }

    return blocks.join("\n\n").slice(0, 15_000);
  }

  private extractSameOriginLinks(
    $: cheerio.CheerioAPI,
    currentUrl: string,
    origin: string,
  ): string[] {
    const links: string[] = [];
    const seen = new Set<string>();

    $("a[href]").each((_, el) => {
      try {
        const href = $(el).attr("href");
        if (!href) return;

        const absolute = new URL(href, currentUrl);

        if (absolute.origin !== origin) return;
        if (absolute.protocol !== "http:" && absolute.protocol !== "https:") return;

        // Skip anchors, files, login/auth pages, legal boilerplate
        if (absolute.hash && absolute.pathname === new URL(currentUrl).pathname) return;
        if (/\.(pdf|jpg|jpeg|png|gif|svg|mp4|zip|doc|docx)$/i.test(absolute.pathname)) return;
        if (/\/(login|signup|register|auth|admin|cart|checkout|privacy|terms|cookies|cookie|dpa|gdpr|legal|data-deletion)/i.test(absolute.pathname))
          return;

        absolute.hash = "";
        const clean = absolute.href;

        if (!seen.has(clean)) {
          seen.add(clean);
          links.push(clean);
        }
      } catch {
        // Invalid URL — skip
      }
    });

    return links;
  }

  private normalizeUrl(input: string): URL | null {
    let cleaned = input.trim();
    if (!/^https?:\/\//i.test(cleaned)) {
      cleaned = `https://${cleaned}`;
    }
    try {
      return new URL(cleaned);
    } catch {
      return null;
    }
  }

  private canonicalize(url: string): string {
    try {
      const u = new URL(url);
      u.hash = "";
      // Remove trailing slash for consistency
      const path = u.pathname.replace(/\/+$/, "") || "/";
      return `${u.origin}${path}${u.search}`.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }
}
