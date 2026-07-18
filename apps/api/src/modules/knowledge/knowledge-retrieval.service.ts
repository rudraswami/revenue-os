import { Injectable } from "@nestjs/common";
import type { KnowledgeCategory, KnowledgeHit } from "@growvisi/shared";
import { KnowledgeEmbedService } from "./knowledge-embed.service";
import { PrismaService } from "../prisma/prisma.service";

export interface RetrieveKnowledgeInput {
  organizationId: string;
  query: string;
  limit?: number;
  categories?: KnowledgeCategory[];
  minSimilarity?: number;
}

@Injectable()
export class KnowledgeRetrievalService {
  constructor(
    private readonly embed: KnowledgeEmbedService,
    private readonly prisma: PrismaService,
  ) {}

  async retrieve(input: RetrieveKnowledgeInput): Promise<KnowledgeHit[]> {
    const limit = input.limit ?? 5;
    const minSimilarity = input.minSimilarity ?? 0.2;
    const rows = await this.embed.searchDetailed(
      input.organizationId,
      input.query,
      limit,
      input.categories,
    );

    return rows
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
  }

  formatForPrompt(hits: KnowledgeHit[], maxChunkLen = 320): string {
    if (hits.length === 0) return "";
    return hits
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

  async getHealth(organizationId: string) {
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

    return {
      docCount,
      chunkCount,
      lastIndexedAt: lastDoc?.updatedAt?.toISOString() ?? null,
    };
  }
}
