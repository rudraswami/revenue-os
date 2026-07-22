import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { JwtPayload, KnowledgeCategory } from "@growvisi/shared";
import { DOMAIN_EVENTS } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { BusinessEventService } from "../events/business-event.service";
import { WebsiteCrawlService } from "./website-crawl.service";
import { ContentStructureService } from "./content-structure.service";
import { KnowledgeService } from "./knowledge.service";

@Injectable()
export class WebsiteImportService {
  private readonly logger = new Logger(WebsiteImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly events: BusinessEventService,
    private readonly crawl: WebsiteCrawlService,
    private readonly structure: ContentStructureService,
    private readonly knowledge: KnowledgeService,
  ) {}

  async startImport(user: JwtPayload, url: string) {
    await this.entitlements.assertHasAccess(user.organizationId);

    const cleanUrl = url.trim();
    this.validateUrl(cleanUrl);

    // Don't allow multiple concurrent imports
    const active = await this.prisma.websiteImport.findFirst({
      where: {
        organizationId: user.organizationId,
        status: { in: ["crawling", "extracting"] },
      },
    });
    if (active) {
      throw new BadRequestException(
        "An import is already in progress. Wait for it to finish or cancel it.",
      );
    }

    const imp = await this.prisma.websiteImport.create({
      data: {
        organizationId: user.organizationId,
        url: cleanUrl,
        status: "crawling",
      },
    });

    // Run pipeline synchronously — serverless kills background work (void/waitUntil)
    // before the crawl + extraction can complete. Awaiting ensures it finishes.
    await this.runImportPipeline(imp.id, user.organizationId, cleanUrl);

    return this.getImport(user, imp.id);
  }

  private validateUrl(url: string): void {
    if (!url) {
      throw new BadRequestException("URL is required");
    }

    let parsed: URL;
    try {
      parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    } catch {
      throw new BadRequestException("Please enter a valid website URL");
    }

    if (!parsed.hostname.includes(".")) {
      throw new BadRequestException("Please enter a valid domain (e.g. yourbusiness.com)");
    }

    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(parsed.hostname)) {
      throw new BadRequestException("Cannot import from local/private network addresses");
    }
  }

  async getImport(user: JwtPayload, importId: string) {
    const imp = await this.prisma.websiteImport.findFirst({
      where: { id: importId, organizationId: user.organizationId },
      include: {
        items: {
          orderBy: [{ confidence: "desc" }, { createdAt: "asc" }],
        },
      },
    });
    if (!imp) throw new NotFoundException("Import not found");
    return this.formatImport(imp);
  }

  async listImports(user: JwtPayload) {
    const imports = await this.prisma.websiteImport.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        _count: { select: { items: true } },
      },
    });

    return imports.map((imp) => ({
      id: imp.id,
      url: imp.url,
      status: imp.status,
      pagesFound: imp.pagesFound,
      pagesCrawled: imp.pagesCrawled,
      itemsExtracted: imp.itemsExtracted,
      itemsApproved: imp.itemsApproved,
      error: imp.error,
      createdAt: imp.createdAt,
      completedAt: imp.completedAt,
      totalItems: imp._count.items,
    }));
  }

  /** Approve selected import items — creates KnowledgeDocuments for each. */
  async approveItems(user: JwtPayload, importId: string, itemIds: string[]) {
    await this.entitlements.assertHasAccess(user.organizationId);

    const imp = await this.prisma.websiteImport.findFirst({
      where: { id: importId, organizationId: user.organizationId },
    });
    if (!imp) throw new NotFoundException("Import not found");

    const items = await this.prisma.websiteImportItem.findMany({
      where: {
        id: { in: itemIds },
        importId,
        status: "pending",
      },
    });

    const results: Array<{ itemId: string; documentId: string }> = [];

    for (const item of items) {
      const doc = await this.knowledge.create(
        user,
        item.title,
        item.content,
        (item.category as KnowledgeCategory) || "general",
        {
          sourceType: "website_import",
          sourceUrl: item.pageUrl,
        },
      );

      // Link to import
      await this.prisma.knowledgeDocument.update({
        where: { id: doc.id },
        data: { importId },
      });

      await this.prisma.websiteImportItem.update({
        where: { id: item.id },
        data: { status: "approved" },
      });

      results.push({ itemId: item.id, documentId: doc.id });
    }

    // Update approved count
    const approvedCount = await this.prisma.websiteImportItem.count({
      where: { importId, status: "approved" },
    });
    await this.prisma.websiteImport.update({
      where: { id: importId },
      data: { itemsApproved: approvedCount },
    });

    void this.events.emit({
      organizationId: user.organizationId,
      type: DOMAIN_EVENTS.KNOWLEDGE_IMPORT_COMPLETED,
      entityType: "knowledge",
      entityId: importId,
      payload: { action: "items_approved", count: results.length },
    });

    return { approved: results.length, results };
  }

  /** Approve all pending items at once. */
  async approveAll(user: JwtPayload, importId: string) {
    const imp = await this.prisma.websiteImport.findFirst({
      where: { id: importId, organizationId: user.organizationId },
    });
    if (!imp) throw new NotFoundException("Import not found");

    const pendingItems = await this.prisma.websiteImportItem.findMany({
      where: { importId, status: "pending" },
      select: { id: true },
    });

    if (pendingItems.length === 0) {
      return { approved: 0, results: [] };
    }

    return this.approveItems(
      user,
      importId,
      pendingItems.map((i) => i.id),
    );
  }

  /** Dismiss/reject specific import items. */
  async dismissItems(user: JwtPayload, importId: string, itemIds: string[]) {
    const imp = await this.prisma.websiteImport.findFirst({
      where: { id: importId, organizationId: user.organizationId },
    });
    if (!imp) throw new NotFoundException("Import not found");

    await this.prisma.websiteImportItem.updateMany({
      where: {
        id: { in: itemIds },
        importId,
        status: "pending",
      },
      data: { status: "dismissed" },
    });

    return { dismissed: itemIds.length };
  }

  /** Update an import item's content before approving. */
  async updateItem(
    user: JwtPayload,
    importId: string,
    itemId: string,
    patch: { title?: string; content?: string; category?: string },
  ) {
    const imp = await this.prisma.websiteImport.findFirst({
      where: { id: importId, organizationId: user.organizationId },
    });
    if (!imp) throw new NotFoundException("Import not found");

    const item = await this.prisma.websiteImportItem.findFirst({
      where: { id: itemId, importId },
    });
    if (!item) throw new NotFoundException("Import item not found");

    return this.prisma.websiteImportItem.update({
      where: { id: itemId },
      data: {
        title: patch.title?.trim() ?? undefined,
        content: patch.content?.trim() ?? undefined,
        category: patch.category ?? undefined,
      },
    });
  }

  /** Re-crawl and re-extract from the same URL. */
  async resync(user: JwtPayload, importId: string) {
    const imp = await this.prisma.websiteImport.findFirst({
      where: { id: importId, organizationId: user.organizationId },
    });
    if (!imp) throw new NotFoundException("Import not found");

    if (imp.status === "crawling" || imp.status === "extracting") {
      throw new BadRequestException("Import is still in progress");
    }

    // Reset and re-run
    await this.prisma.websiteImportItem.deleteMany({
      where: { importId, status: { in: ["pending", "dismissed"] } },
    });

    await this.prisma.websiteImport.update({
      where: { id: importId },
      data: {
        status: "crawling",
        pagesFound: 0,
        pagesCrawled: 0,
        itemsExtracted: 0,
        error: null,
        completedAt: null,
      },
    });

    await this.runImportPipeline(importId, user.organizationId, imp.url);

    return this.getImport(user, importId);
  }

  /** Cancel an in-progress import. */
  async cancelImport(user: JwtPayload, importId: string) {
    const imp = await this.prisma.websiteImport.findFirst({
      where: { id: importId, organizationId: user.organizationId },
    });
    if (!imp) throw new NotFoundException("Import not found");

    await this.prisma.websiteImport.update({
      where: { id: importId },
      data: { status: "cancelled", completedAt: new Date() },
    });

    return { id: importId, status: "cancelled" };
  }

  // ── Pipeline ──────────────────────────────────────────────────────────────

  private async runImportPipeline(importId: string, organizationId: string, url: string) {
    try {
      // Phase 1: Crawl
      this.logger.log(`[Import ${importId}] Phase 1: Crawling ${url}`);
      const crawlResult = await this.crawl.crawl(url);

      this.logger.log(
        `[Import ${importId}] Crawl result: ${crawlResult.pages.length} pages, error=${crawlResult.error ?? "none"}`,
      );
      for (const page of crawlResult.pages) {
        this.logger.debug(
          `[Import ${importId}] Page: ${page.url} — title="${page.title}" textLen=${page.text.length}`,
        );
      }

      await this.prisma.websiteImport.update({
        where: { id: importId },
        data: {
          pagesFound: crawlResult.pages.length,
          pagesCrawled: crawlResult.pages.length,
          crawlMeta: {
            siteName: crawlResult.siteName,
            baseUrl: crawlResult.baseUrl,
            crawledUrls: crawlResult.pages.map((p) => p.url),
          },
          status: crawlResult.error && crawlResult.pages.length === 0 ? "failed" : "extracting",
          error: crawlResult.pages.length === 0 ? crawlResult.error : null,
        },
      });

      if (crawlResult.pages.length === 0) {
        this.logger.warn(`[Import ${importId}] No pages crawled: ${crawlResult.error}`);
        return;
      }

      // Phase 2: Extract structured knowledge via LLM
      this.logger.log(
        `[Import ${importId}] Phase 2: Extracting knowledge from ${crawlResult.pages.length} pages`,
      );
      const items = await this.structure.extractFromPages(crawlResult.pages);
      this.logger.log(`[Import ${importId}] Extraction result: ${items.length} items`);

      // Phase 3: Store import items for review
      for (const item of items) {
        await this.prisma.websiteImportItem.create({
          data: {
            importId,
            pageUrl: item.sourceUrl,
            category: item.category,
            title: item.title,
            content: item.content,
            confidence: item.confidence,
            status: "pending",
          },
        });
      }

      await this.prisma.websiteImport.update({
        where: { id: importId },
        data: {
          status: "review",
          itemsExtracted: items.length,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `[Import ${importId}] Completed — ${items.length} items from ${crawlResult.pages.length} pages`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`[Import ${importId}] Pipeline failed: ${message}`, stack);

      await this.prisma.websiteImport
        .update({
          where: { id: importId },
          data: {
            status: "failed",
            error: message.slice(0, 500),
            completedAt: new Date(),
          },
        })
        .catch((dbErr) =>
          this.logger.error(`[Import ${importId}] Could not update status to failed: ${dbErr}`),
        );
    }
  }

  private formatImport(imp: {
    id: string;
    url: string;
    status: string;
    pagesFound: number;
    pagesCrawled: number;
    itemsExtracted: number;
    itemsApproved: number;
    error: string | null;
    crawlMeta: unknown;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    items: Array<{
      id: string;
      pageUrl: string;
      category: string;
      title: string;
      content: string;
      confidence: number;
      status: string;
      metadata: unknown;
      createdAt: Date;
    }>;
  }) {
    return {
      id: imp.id,
      url: imp.url,
      status: imp.status,
      pagesFound: imp.pagesFound,
      pagesCrawled: imp.pagesCrawled,
      itemsExtracted: imp.itemsExtracted,
      itemsApproved: imp.itemsApproved,
      error: imp.error,
      siteName: (imp.crawlMeta as Record<string, unknown>)?.siteName ?? null,
      createdAt: imp.createdAt,
      completedAt: imp.completedAt,
      items: imp.items.map((item) => ({
        id: item.id,
        pageUrl: item.pageUrl,
        category: item.category,
        title: item.title,
        content: item.content,
        confidence: item.confidence,
        status: item.status,
        createdAt: item.createdAt,
      })),
    };
  }
}
