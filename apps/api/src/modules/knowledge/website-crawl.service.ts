import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as cheerio from "cheerio";
import { fetchWithTimeout } from "../../common/http/fetch-with-timeout";

const MAX_PAGES = 30;
const CRAWL_TIMEOUT_MS = 12_000;
const MAX_DEPTH = 3;

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
          for (const link of page.links) {
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
          "User-Agent": "GrowvisiBot/1.0 (+https://growvisi.com/bot)",
          Accept: "text/html,application/xhtml+xml",
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

    // Remove non-content elements
    $("script, style, noscript, iframe, svg, nav, footer, header").remove();
    $("[aria-hidden='true']").remove();
    $(".cookie-banner, .popup, .modal, #cookie-consent").remove();

    const title = $("title").text().trim() || $("h1").first().text().trim() || url;
    const description =
      $('meta[name="description"]').attr("content")?.trim() ??
      $('meta[property="og:description"]').attr("content")?.trim() ??
      null;

    const mainContent = $("main, article, [role='main'], .content, .page-content, #content");
    const textSource = mainContent.length > 0 ? mainContent : $("body");

    const text = this.extractCleanText($, textSource);

    if (text.length < 50) return null;

    const links = this.extractSameOriginLinks($, url, origin);

    return { url, title, text, links, description };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractCleanText($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string {
    const blocks: string[] = [];

    el.find("h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, dt, dd, address").each(
      (_, elem) => {
        const tag = (elem as { tagName?: string }).tagName?.toLowerCase() ?? "";
        const text = $(elem).text().replace(/\s+/g, " ").trim();
        if (!text) return;

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

        // Skip anchors, files, login/auth pages
        if (absolute.hash && absolute.pathname === new URL(currentUrl).pathname) return;
        if (/\.(pdf|jpg|jpeg|png|gif|svg|mp4|zip|doc|docx)$/i.test(absolute.pathname)) return;
        if (/\/(login|signup|register|auth|admin|cart|checkout)/i.test(absolute.pathname)) return;

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
