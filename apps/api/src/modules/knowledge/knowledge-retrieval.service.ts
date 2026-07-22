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
const MAX_RETRIEVAL_QUERIES = 3;

/**
 * Build the set of retrieval queries: the primary query plus up to two distinct
 * customer needs that aren't already covered by it. Kept small so the parallel
 * fan-out stays cheap.
 */
export function buildRetrievalQueries(
  primary: string,
  customerNeeds?: string[],
): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();
  const push = (q: string | null | undefined) => {
    const trimmed = q?.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    queries.push(trimmed);
  };

  push(primary);
  const primaryLower = primary.trim().toLowerCase();
  for (const need of customerNeeds ?? []) {
    if (queries.length >= MAX_RETRIEVAL_QUERIES) break;
    const trimmed = need?.trim();
    if (!trimmed || trimmed.length < 3) continue;
    // Skip needs already contained in the primary query to avoid duplicate lookups.
    if (primaryLower.includes(trimmed.toLowerCase())) continue;
    push(trimmed);
  }

  return queries.length > 0 ? queries : [primary || "customer inquiry"];
}

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
    const count = await this.getCachedChunkCount(organizationId);
    return count > 0;
  }

  /** Cached org chunk count — used by inbox context without full KB health scans. */
  async getCachedChunkCount(organizationId: string): Promise<number> {
    const cached = this.chunkCountCache.get(organizationId);
    if (cached && Date.now() - cached.at < CHUNK_CACHE_TTL_MS) {
      return cached.count;
    }
    const count = await this.prisma.knowledgeChunk.count({
      where: { document: { organizationId } },
    });
    this.chunkCountCache.set(organizationId, { count, at: Date.now() });
    return count;
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

    // Multi-query: search the raw message plus each distinct customer need in
    // parallel, then merge. This surfaces evidence for every part of a multi-part
    // question ("price AND delivery AND EMI") that a single embedding misses.
    // Queries run concurrently, so latency stays close to a single lookup.
    const queries = buildRetrievalQueries(input.query, input.customerNeeds);

    const rowSets = await Promise.all(
      queries.map((q) =>
        this.embed.searchDetailed(input.organizationId, q, limit, categoriesUsed),
      ),
    );

    // Dedup by chunk, keeping the strongest similarity across all queries.
    const bestByChunk = new Map<
      string,
      Awaited<ReturnType<KnowledgeEmbedService["searchDetailed"]>>[number]
    >();
    for (const rows of rowSets) {
      for (const r of rows) {
        const existing = bestByChunk.get(r.chunkId);
        if (!existing || r.similarity > existing.similarity) {
          bestByChunk.set(r.chunkId, r);
        }
      }
    }

    const hits: KnowledgeHit[] = Array.from(bestByChunk.values())
      .filter((r) => r.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
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
