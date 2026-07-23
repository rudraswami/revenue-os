import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import type { JwtPayload, KnowledgeCategory } from "@growvisi/shared";
import { DOMAIN_EVENTS, JOB_TYPES, KNOWLEDGE_SOURCE_INDUSTRY_HANDBOOK, QUEUES, normalizeInrPricingInContent } from "@growvisi/shared";
import { EntitlementsService } from "../billing/entitlements.service";
import { PrismaService } from "../prisma/prisma.service";
import { BusinessEventService } from "../events/business-event.service";
import { KnowledgeEmbedService } from "./knowledge-embed.service";
import { KnowledgeRetrievalService } from "./knowledge-retrieval.service";
import { useBackgroundWorkers } from "../../config/workers";
import { withTimeout } from "../../common/utils/with-timeout";
import { JobsService } from "../jobs/jobs.service";

function prepareKnowledgeContent(content: string, category?: string): string {
  const trimmed = content.trim();
  if (!trimmed) return trimmed;
  if (category === "pricing" || /\bplan\b/i.test(trimmed)) {
    return normalizeInrPricingInContent(trimmed);
  }
  return trimmed;
}

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embed: KnowledgeEmbedService,
    private readonly retrieval: KnowledgeRetrievalService,
    private readonly entitlements: EntitlementsService,
    private readonly events: BusinessEventService,
    private readonly jobs: JobsService,
    @InjectQueue(QUEUES.AI_EMBED) private readonly embedQueue: Queue,
  ) {}

  async list(user: JwtPayload) {
    const docs = await this.prisma.knowledgeDocument.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        sourceType: true,
        sourceUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        rawContent: true,
        _count: { select: { chunks: true } },
      },
    });

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      sourceType: d.sourceType,
      sourceUrl: d.sourceUrl,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      rawContent: d.rawContent,
      chunkCount: d._count.chunks,
    }));
  }

  async create(
    user: JwtPayload,
    title: string,
    content: string,
    category: KnowledgeCategory = "general",
    options?: { sourceType?: string; sourceUrl?: string | null },
  ) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const prepared = prepareKnowledgeContent(content, category);
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        organizationId: user.organizationId,
        title: title.trim(),
        rawContent: prepared,
        category,
        sourceType: options?.sourceType ?? "manual",
        sourceUrl: options?.sourceUrl ?? null,
        status: "pending",
      },
      select: {
        id: true,
        title: true,
        category: true,
        sourceType: true,
        sourceUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        rawContent: true,
      },
    });

    const embedResult = await this.scheduleEmbed(doc.id, user.organizationId);
    void this.events.emit({
      organizationId: user.organizationId,
      type: DOMAIN_EVENTS.KNOWLEDGE_DOCUMENT_UPDATED,
      entityType: "knowledge",
      entityId: doc.id,
      payload: { action: "created" },
    });
    return {
      ...doc,
      chunkCount: embedResult.chunks,
      status: embedResult.failed
        ? "failed"
        : embedResult.chunks > 0
          ? "indexed"
          : "pending",
    };
  }

  async update(
    user: JwtPayload,
    id: string,
    patch: { title?: string; content?: string; category?: KnowledgeCategory },
  ) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const existing = await this.prisma.knowledgeDocument.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException("Document not found");

    const category = patch.category ?? existing.category;
    const prepared =
      patch.content !== undefined
        ? prepareKnowledgeContent(patch.content, category)
        : undefined;

    const doc = await this.prisma.knowledgeDocument.update({
      where: { id },
      data: {
        title: patch.title?.trim() ?? undefined,
        rawContent: prepared,
        category: patch.category ?? undefined,
        status: "pending",
      },
      select: {
        id: true,
        title: true,
        category: true,
        sourceType: true,
        sourceUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        rawContent: true,
      },
    });

    const embedResult = await this.scheduleEmbed(id, user.organizationId);
    void this.events.emit({
      organizationId: user.organizationId,
      type: DOMAIN_EVENTS.KNOWLEDGE_DOCUMENT_UPDATED,
      entityType: "knowledge",
      entityId: id,
      payload: { action: "updated" },
    });
    return {
      ...doc,
      chunkCount: embedResult.chunks,
      status: embedResult.failed
        ? "failed"
        : embedResult.chunks > 0
          ? "indexed"
          : "pending",
    };
  }

  async reindex(user: JwtPayload, id: string) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const existing = await this.prisma.knowledgeDocument.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException("Document not found");

    const embedResult = await this.scheduleEmbed(id, user.organizationId, true);
    return { ok: true, chunkCount: embedResult.chunks, failed: embedResult.failed ?? false };
  }

  /** Re-embed every document for the org (e.g. after chunking improvements). */
  async reindexAll(user: JwtPayload) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const docs = await this.prisma.knowledgeDocument.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });
    let queued = 0;
    for (const doc of docs) {
      await this.scheduleEmbed(doc.id, user.organizationId, true);
      queued += 1;
    }
    return { ok: true, queued };
  }

  async remove(user: JwtPayload, id: string) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const existing = await this.prisma.knowledgeDocument.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException("Document not found");
    await this.prisma.knowledgeDocument.delete({ where: { id } });
    this.retrieval.invalidateChunkCountCache(user.organizationId);
    void this.events.emit({
      organizationId: user.organizationId,
      type: DOMAIN_EVENTS.KNOWLEDGE_DOCUMENT_UPDATED,
      entityType: "knowledge",
      entityId: id,
      payload: { action: "deleted" },
    });
    return { deleted: true };
  }

  async testRetrieve(user: JwtPayload, query: string, limit = 5) {
    await this.entitlements.assertHasAccess(user.organizationId);
    return this.retrieval.retrieve({
      organizationId: user.organizationId,
      query,
      limit,
    });
  }

  async health(user: JwtPayload) {
    await this.entitlements.assertHasAccess(user.organizationId);
    return this.retrieval.getHealth(user.organizationId);
  }

  /**
   * Remove all industry handbook seed documents for a workspace.
   * Called when switching to custom/other or before applying a new handbook.
   */
  async purgeIndustryHandbookDocuments(organizationId: string): Promise<number> {
    const result = await this.prisma.knowledgeDocument.deleteMany({
      where: { organizationId, sourceType: KNOWLEDGE_SOURCE_INDUSTRY_HANDBOOK },
    });
    if (result.count > 0) {
      this.retrieval.invalidateChunkCountCache(organizationId);
    }
    return result.count;
  }

  /**
   * Re-apply INR normalization on pricing docs and re-embed so gap detection
   * and compose grounding see ₹ amounts (fixes crawls like "Solo Plan: 999").
   */
  async renormalizePricingDocuments(organizationId: string): Promise<number> {
    const docs = await this.prisma.knowledgeDocument.findMany({
      where: {
        organizationId,
        OR: [
          { category: "pricing" },
          { title: { contains: "pricing", mode: "insensitive" } },
          { title: { contains: "plan", mode: "insensitive" } },
        ],
      },
      select: { id: true, rawContent: true, category: true, title: true },
    });

    let updated = 0;
    for (const doc of docs) {
      const raw = doc.rawContent ?? "";
      if (!raw.trim()) continue;
      const normalized = prepareKnowledgeContent(raw, doc.category);
      if (normalized === raw) continue;

      await this.prisma.knowledgeDocument.update({
        where: { id: doc.id },
        data: { rawContent: normalized, status: "pending" },
      });
      await this.scheduleEmbed(doc.id, organizationId);
      updated += 1;
    }

    if (updated > 0) {
      this.retrieval.invalidateChunkCountCache(organizationId);
    }
    return updated;
  }

  /**
   * Aggregate knowledge gap signals from recent AI runs to surface actionable
   * recommendations like "Your customers asked about delivery 12 times this
   * week — add it to Business Knowledge to auto-answer."
   */
  async getGapRecommendations(user: JwtPayload) {
    await this.entitlements.assertHasAccess(user.organizationId);

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const runs = await this.prisma.aiRun.findMany({
      where: {
        organizationId: user.organizationId,
        type: { in: ["classify", "classify_refresh"] },
        status: "COMPLETED",
        createdAt: { gte: since },
      },
      select: { output: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const topicCounts = new Map<string, number>();
    const blockerCounts = new Map<string, number>();
    let totalGaps = 0;

    for (const run of runs) {
      const output = run.output as Record<string, unknown> | null;
      if (!output) continue;

      const metrics = output.metrics as Record<string, unknown> | undefined;
      if (metrics?.knowledgeGap) {
        totalGaps++;
      }

      const missingTopics = metrics?.missingTopics as string[] | undefined;
      if (Array.isArray(missingTopics)) {
        for (const topic of missingTopics) {
          topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
        }
      }

      const spans = output.spans as Record<string, unknown> | undefined;
      const blockers = (spans as Record<string, unknown> | undefined) ?? output;
      const metricBlockers = metrics?.blockers as string[] | undefined;
      if (Array.isArray(metricBlockers)) {
        for (const b of metricBlockers) {
          if (["not_grounded", "weak_grounding", "knowledge_gap", "kb_not_indexed", "low_answerability"].includes(b)) {
            blockerCounts.set(b, (blockerCounts.get(b) ?? 0) + 1);
          }
        }
      }
    }

    const recommendations = Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({
        topic,
        count,
        message: `Your customers asked about "${topic}" ${count} time${count === 1 ? "" : "s"} this week — add it to Business Knowledge to auto-answer.`,
      }));

    return {
      totalClassifications: runs.length,
      totalGaps,
      gapRate: runs.length > 0 ? Math.round((totalGaps / runs.length) * 100) : 0,
      recommendations,
      blockerBreakdown: Object.fromEntries(blockerCounts),
    };
  }

  private async scheduleEmbed(
    documentId: string,
    organizationId: string,
    forceInline = false,
  ): Promise<{ chunks: number; failed?: boolean }> {
    if (useBackgroundWorkers() && !forceInline) {
      try {
        await withTimeout(
          this.embedQueue.add(
            "embed",
            { documentId, organizationId },
            { jobId: `embed:${documentId}`, removeOnComplete: 500, removeOnFail: 2000 },
          ),
          5_000,
          "Embed queue unavailable",
        );
        return { chunks: 0 };
      } catch {
        // fall through to inline
      }
    }

    // Serverless with QStash: embed off the request path so uploads never block.
    if (this.jobs.durable && !forceInline) {
      this.jobs.enqueue(
        JOB_TYPES.AI_EMBED,
        { documentId, organizationId },
        () => this.runEmbedJob(documentId, organizationId),
        { deduplicationId: `embed:${documentId}` },
      );
      return { chunks: 0 };
    }

    const result = await this.runEmbedJob(documentId, organizationId);
    return { chunks: result.chunks, failed: result.failed };
  }

  /** QStash callback / inline entrypoint — embed a document and refresh caches. */
  async runEmbedJob(
    documentId: string,
    organizationId: string,
  ): Promise<{ chunks: number; failed?: boolean }> {
    const result = await this.embed.embedDocument(documentId, organizationId);
    this.retrieval.invalidateChunkCountCache(organizationId);
    return { chunks: result.chunks, failed: result.failed };
  }

  /** Queue or inline-embed a document (handbook seed, uploads, re-index). */
  async scheduleDocumentEmbed(
    documentId: string,
    organizationId: string,
  ): Promise<{ chunks: number; failed?: boolean }> {
    return this.scheduleEmbed(documentId, organizationId);
  }
}
