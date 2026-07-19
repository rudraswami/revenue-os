import { Injectable } from "@nestjs/common";
import type { KnowledgeCategory, KnowledgeHit, RetrievalResult } from "@growvisi/shared";
import {
  buildRetrievalResult,
  computeGapRiskScore,
  rankKnowledgeHits,
  resolveRetrievalCategories,
  type KnowledgeHealthSummary,
} from "@growvisi/shared";
import { KnowledgeEmbedService } from "./knowledge-embed.service";
import { PrismaService } from "../prisma/prisma.service";

export interface RetrieveKnowledgeInput {
  organizationId: string;
  query: string;
  limit?: number;
  categories?: KnowledgeCategory[];
  minSimilarity?: number;
  /** Pre-classify or post-classify intent for category routing. */
  intentKind?: string;
  lastInbound?: string | null;
  customerNeeds?: string[];
}

const CHUNK_CACHE_TTL_MS = 60_000;

@Injectable()
export class KnowledgeRetrievalService {
  private readonly chunkCountCache = new Map<string, { count: number; at: number }>();

  constructor(
    private readonly embed: KnowledgeEmbedService,
    private readonly prisma: PrismaService,
  ) {}

  invalidateChunkCountCache(organizationId: string): void {
    this.chunkCountCache.delete(organizationId);
  }

  async hasIndexedChunks(organizationId: string): Promise<boolean> {
    const cached = this.chunkCountCache.get(organizationId);
    if (cached && Date.now() - cached.at < CHUNK_CACHE_TTL_MS) {
      return cached.count > 0;
    }
    const count = await this.prisma.knowledgeChunk.count({
      where: { document: { organizationId } },
    });
    this.chunkCountCache.set(organizationId, { count, at: Date.now() });
    return count > 0;
  }

  async retrieveDetailed(input: RetrieveKnowledgeInput): Promise<RetrievalResult> {
    const categoriesUsed =
      input.categories ?? resolveRetrievalCategories(input.intentKind);
    const hasIndexedChunks = await this.hasIndexedChunks(input.organizationId);

    if (!hasIndexedChunks) {
      return buildRetrievalResult({
        hits: [],
        intentKind: input.intentKind,
        lastInbound: input.lastInbound,
        customerNeeds: input.customerNeeds,
        hasIndexedChunks: false,
        categoriesUsed,
      });
    }

    const limit = input.limit ?? 5;
    const minSimilarity = input.minSimilarity ?? 0.2;
    const rows = await this.embed.searchDetailed(
      input.organizationId,
      input.query,
      limit,
      categoriesUsed,
    );

    const hits: KnowledgeHit[] = rows
      .filter((r) => r.similarity >= minSimilarity)
      .map((r) => ({
        chunkId: r.chunkId,
        documentId: r.documentId,
        title: r.title,
        content: r.content,
        similarity: r.similarity,
        category: r.category,
        citation: `${r.title} (${Math.round(r.similarity * 100)}% match)`,
      }));

    return buildRetrievalResult({
      hits,
      intentKind: input.intentKind,
      lastInbound: input.lastInbound,
      customerNeeds: input.customerNeeds,
      hasIndexedChunks: true,
      categoriesUsed,
    });
  }

  async retrieve(input: RetrieveKnowledgeInput): Promise<KnowledgeHit[]> {
    const result = await this.retrieveDetailed(input);
    return result.hits;
  }

  formatForPrompt(
    hits: KnowledgeHit[],
    maxChunkLen = 320,
    preferredCategories?: KnowledgeCategory[],
  ): string {
    if (hits.length === 0) return "";
    const ranked = rankKnowledgeHits(hits, preferredCategories);
    return ranked
      .map((h) => `- ${h.title}: ${h.content.slice(0, maxChunkLen)}`)
      .join("\n");
  }

  async fallbackDocuments(organizationId: string, limit = 3) {
    return this.prisma.knowledgeDocument.findMany({
      where: { organizationId, status: { in: ["active", "indexed"] } },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: { id: true, title: true, rawContent: true, category: true },
    });
  }

  async getHealth(organizationId: string): Promise<KnowledgeHealthSummary> {
    const [docCount, chunkCount, lastDoc] = await Promise.all([
      this.prisma.knowledgeDocument.count({ where: { organizationId } }),
      this.prisma.knowledgeChunk.count({
        where: { document: { organizationId } },
      }),
      this.prisma.knowledgeDocument.findFirst({
        where: { organizationId, status: "indexed" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
    ]);

    const gapRiskScore = computeGapRiskScore({ chunkCount, docCount });

    return {
      docCount,
      chunkCount,
      lastIndexedAt: lastDoc?.updatedAt?.toISOString() ?? null,
      gapRiskScore,
      readyForResponsivePreset: chunkCount > 0,
    };
  }
}
