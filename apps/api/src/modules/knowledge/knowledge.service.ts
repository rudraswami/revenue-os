import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import type { JwtPayload, KnowledgeCategory } from "@growvisi/shared";
import { DOMAIN_EVENTS, QUEUES } from "@growvisi/shared";
import { EntitlementsService } from "../billing/entitlements.service";
import { PrismaService } from "../prisma/prisma.service";
import { BusinessEventService } from "../events/business-event.service";
import { KnowledgeEmbedService } from "./knowledge-embed.service";
import { KnowledgeRetrievalService } from "./knowledge-retrieval.service";
import { useBackgroundWorkers } from "../../config/workers";
import { withTimeout } from "../../common/utils/with-timeout";

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embed: KnowledgeEmbedService,
    private readonly retrieval: KnowledgeRetrievalService,
    private readonly entitlements: EntitlementsService,
    private readonly events: BusinessEventService,
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
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        organizationId: user.organizationId,
        title: title.trim(),
        rawContent: content.trim(),
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

    const doc = await this.prisma.knowledgeDocument.update({
      where: { id },
      data: {
        title: patch.title?.trim() ?? undefined,
        rawContent: patch.content?.trim() ?? undefined,
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
