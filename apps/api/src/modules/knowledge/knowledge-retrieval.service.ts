import { Injectable } from "@nestjs/common";
import type {
  KnowledgeCategory,
  KnowledgeHit,
  QuickAnswer,
  RetrievalResult,
} from "@growvisi/shared";
import {
  buildRetrievalResult,
  computeGapRiskScore,
  handbookDocumentSourceUrl,
  isCustomIndustryId,
  isIndustryHandbookId,
  KNOWLEDGE_SOURCE_INDUSTRY_HANDBOOK,
  matchQuickAnswers,
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
  /** Structured FAQ/price pairs matched deterministically as extra grounding. */
  quickAnswers?: QuickAnswer[];
  /**
   * Clean rewritten search queries (from QueryRewriteService). When present,
   * these REPLACE the raw primary query for vector search — they embed far
   * closer to knowledge chunks than raw Hinglish/vague customer text.
   */
  rewrittenQueries?: string[];
}

const CHUNK_CACHE_TTL_MS = 60_000;
const MAX_RETRIEVAL_QUERIES = 3;
const INDUSTRY_POLICY_CACHE_TTL_MS = 60_000;

interface IndustryKnowledgePolicy {
  excludeAllHandbook: boolean;
  allowedHandbookSourceUrl?: string;
}

/** Defensively count stored Quick Answers from an org's settings JSON. */
function countQuickAnswers(settings: unknown): number {
  if (!settings || typeof settings !== "object") return 0;
  const intelligence = (settings as Record<string, unknown>).intelligence;
  if (!intelligence || typeof intelligence !== "object") return 0;
  const profile = (intelligence as Record<string, unknown>).businessProfile;
  if (!profile || typeof profile !== "object") return 0;
  const quickAnswers = (profile as Record<string, unknown>).quickAnswers;
  return Array.isArray(quickAnswers) ? quickAnswers.length : 0;
}

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
  private readonly industryPolicyCache = new Map<
    string,
    { policy: IndustryKnowledgePolicy; at: number }
  >();
  /** One lazy purge per process for custom workspaces with stale handbook docs. */
  private readonly purgedHandbookOrgs = new Set<string>();

  constructor(
    private readonly embed: KnowledgeEmbedService,
    private readonly prisma: PrismaService,
  ) {}

  invalidateChunkCountCache(organizationId: string): void {
    this.chunkCountCache.delete(organizationId);
    this.industryPolicyCache.delete(organizationId);
    this.purgedHandbookOrgs.delete(organizationId);
  }

  private async resolveIndustryKnowledgePolicy(
    organizationId: string,
  ): Promise<IndustryKnowledgePolicy> {
    const cached = this.industryPolicyCache.get(organizationId);
    if (cached && Date.now() - cached.at < INDUSTRY_POLICY_CACHE_TTL_MS) {
      return cached.policy;
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const intelligence = (org?.settings as Record<string, unknown> | null)?.intelligence;
    const industryId =
      intelligence && typeof intelligence === "object"
        ? (intelligence as Record<string, unknown>).industryId
        : undefined;

    let policy: IndustryKnowledgePolicy;
    if (typeof industryId === "string" && isIndustryHandbookId(industryId)) {
      policy = {
        excludeAllHandbook: false,
        allowedHandbookSourceUrl: handbookDocumentSourceUrl(industryId),
      };
    } else {
      policy = { excludeAllHandbook: true };
    }

    this.industryPolicyCache.set(organizationId, { policy, at: Date.now() });
    return policy;
  }

  private async filterHitsByIndustryPolicy(
    hits: KnowledgeHit[],
    policy: IndustryKnowledgePolicy,
  ): Promise<KnowledgeHit[]> {
    if (hits.length === 0) return hits;

    const docIds = [...new Set(hits.map((h) => h.documentId))];
    const docs = await this.prisma.knowledgeDocument.findMany({
      where: { id: { in: docIds } },
      select: { id: true, sourceType: true, sourceUrl: true },
    });
    const docMap = new Map(docs.map((d) => [d.id, d]));

    return hits.filter((h) => {
      const doc = docMap.get(h.documentId);
      if (!doc || doc.sourceType !== KNOWLEDGE_SOURCE_INDUSTRY_HANDBOOK) return true;
      if (policy.excludeAllHandbook) return false;
      return doc.sourceUrl === policy.allowedHandbookSourceUrl;
    });
  }

  private async maybePurgeStaleHandbookDocs(
    organizationId: string,
    policy: IndustryKnowledgePolicy,
  ): Promise<void> {
    if (!policy.excludeAllHandbook || this.purgedHandbookOrgs.has(organizationId)) return;
    this.purgedHandbookOrgs.add(organizationId);
    const result = await this.prisma.knowledgeDocument.deleteMany({
      where: { organizationId, sourceType: KNOWLEDGE_SOURCE_INDUSTRY_HANDBOOK },
    });
    if (result.count > 0) {
      this.invalidateChunkCountCache(organizationId);
    }
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
    const industryPolicy = await this.resolveIndustryKnowledgePolicy(input.organizationId);
    await this.maybePurgeStaleHandbookDocs(input.organizationId, industryPolicy);

    const categoriesUsed =
      input.categories ?? resolveRetrievalCategories(input.intentKind);
    const hasChunks = await this.hasIndexedChunks(input.organizationId);

    // Structured Quick Answers are matched deterministically (no embeddings) and
    // act as first-class grounding, so an SMB can auto-answer common questions
    // with zero uploaded documents.
    const quickHits = matchQuickAnswers(
      input.lastInbound ?? input.query,
      input.quickAnswers,
      3,
    );

    // Effective grounding exists if the org has indexed chunks OR a curated quick
    // answer matched. `hasIndexedChunks` gates the kb_not_indexed auto-send
    // blocker downstream, so quick answers unblock auto-answers on their own.
    const hasGrounding = hasChunks || quickHits.length > 0;

    if (!hasGrounding) {
      return buildRetrievalResult({
        hits: [],
        intentKind: input.intentKind,
        lastInbound: input.lastInbound,
        customerNeeds: input.customerNeeds,
        hasIndexedChunks: false,
        categoriesUsed,
      });
    }

    if (!hasChunks) {
      // Quick-answer-only grounding (no uploaded docs to search).
      return buildRetrievalResult({
        hits: quickHits,
        intentKind: input.intentKind,
        lastInbound: input.lastInbound,
        customerNeeds: input.customerNeeds,
        hasIndexedChunks: true,
        categoriesUsed,
      });
    }

    const limit = input.limit ?? 8;
    const minSimilarity = input.minSimilarity ?? 0.2;

    // Multi-query: search the rewritten queries (preferred) or the raw message
    // plus each distinct customer need in parallel, then merge. This surfaces
    // evidence for every part of a multi-part question ("price AND delivery
    // AND EMI") that a single embedding misses. Queries run concurrently, so
    // latency stays close to a single lookup.
    const queries =
      input.rewrittenQueries && input.rewrittenQueries.length > 0
        ? [...new Set([...input.rewrittenQueries, ...buildRetrievalQueries(input.query, input.customerNeeds)])].slice(0, 4)
        : buildRetrievalQueries(input.query, input.customerNeeds);

    // Hybrid retrieval: vector search + keyword search (pg_trgm) in parallel.
    // Keyword search catches exact product names and acronyms that embeddings
    // miss, while vector search handles semantic similarity.
    //
    // Category routing is used for RANKING only, never filtering. Filtering by
    // category killed recall: a regex-based pre-classify intent guess like
    // "pricing" (because the word "plan" appeared) would exclude FAQ/general
    // chunks that actually contain the answer. Search everything, rank later.
    const [rowSets, keywordRows] = await Promise.all([
      Promise.all(
        queries.map((q) =>
          this.embed.searchDetailed(input.organizationId, q, limit),
        ),
      ),
      this.embed.keywordSearch(input.organizationId, input.query, 5),
    ]);

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

    // Merge keyword hits: boost score slightly to reflect exact-match value,
    // but don't let keyword-only hits outrank strong semantic matches.
    for (const kr of keywordRows) {
      if (!bestByChunk.has(kr.chunkId) && kr.similarity >= 0.15) {
        bestByChunk.set(kr.chunkId, {
          ...kr,
          similarity: Math.min(kr.similarity * 0.7 + 0.2, 0.75),
        });
      }
    }

    const embeddingHits: KnowledgeHit[] = Array.from(bestByChunk.values())
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

    // Curated quick answers first (authoritative), then fill with embedding hits.
    const mergedHits = [...quickHits, ...embeddingHits].slice(0, limit + quickHits.length);
    const hits = await this.filterHitsByIndustryPolicy(mergedHits, industryPolicy);

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
    maxChunkLen = 1200,
    preferredCategories?: KnowledgeCategory[],
  ): string {
    if (hits.length === 0) return "";
    const ranked = rankKnowledgeHits(hits, preferredCategories);
    return ranked
      .map((h) => `- ${h.title}: ${h.content.slice(0, maxChunkLen)}`)
      .join("\n");
  }

  async fallbackDocuments(organizationId: string, limit = 3) {
    const industryPolicy = await this.resolveIndustryKnowledgePolicy(organizationId);
    const docs = await this.prisma.knowledgeDocument.findMany({
      where: {
        organizationId,
        status: { in: ["active", "indexed"] },
        ...(industryPolicy.excludeAllHandbook
          ? { NOT: { sourceType: KNOWLEDGE_SOURCE_INDUSTRY_HANDBOOK } }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: limit * 3,
      select: { id: true, title: true, rawContent: true, category: true, sourceType: true, sourceUrl: true },
    });

    const filtered = industryPolicy.excludeAllHandbook
      ? docs.filter((d) => d.sourceType !== KNOWLEDGE_SOURCE_INDUSTRY_HANDBOOK)
      : docs.filter(
          (d) =>
            d.sourceType !== KNOWLEDGE_SOURCE_INDUSTRY_HANDBOOK ||
            d.sourceUrl === industryPolicy.allowedHandbookSourceUrl,
        );

    return filtered.slice(0, limit).map(({ sourceType: _s, sourceUrl: _u, ...rest }) => rest);
  }

  async getHealth(organizationId: string): Promise<KnowledgeHealthSummary> {
    const [docCount, chunkCount, lastDoc, org] = await Promise.all([
      this.prisma.knowledgeDocument.count({ where: { organizationId } }),
      this.prisma.knowledgeChunk.count({
        where: { document: { organizationId } },
      }),
      this.prisma.knowledgeDocument.findFirst({
        where: { organizationId, status: "indexed" },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      }),
    ]);

    const quickAnswerCount = countQuickAnswers(org?.settings);
    const gapRiskScore = computeGapRiskScore({ chunkCount, docCount });

    return {
      docCount,
      chunkCount,
      quickAnswerCount,
      lastIndexedAt: lastDoc?.updatedAt?.toISOString() ?? null,
      gapRiskScore,
      // Quick answers are curated grounding, so they unlock broader auto-send
      // without requiring uploaded documents.
      readyForResponsivePreset: chunkCount > 0 || quickAnswerCount > 0,
    };
  }
}
