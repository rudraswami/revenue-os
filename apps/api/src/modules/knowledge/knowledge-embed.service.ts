import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { fetchWithTimeout } from "../../common/http/fetch-with-timeout";
import { PrismaService } from "../prisma/prisma.service";

const CHUNK_SIZE = 900;

@Injectable()
export class KnowledgeEmbedService {
  private readonly logger = new Logger(KnowledgeEmbedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  splitIntoChunks(text: string): string[] {
    const normalized = text.replace(/\r\n/g, "\n").trim();
    if (!normalized) return [];

    const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const chunks: string[] = [];
    let current = "";

    for (const para of paragraphs) {
      if (`${current}\n\n${para}`.length <= CHUNK_SIZE) {
        current = current ? `${current}\n\n${para}` : para;
      } else {
        if (current) chunks.push(current);
        if (para.length <= CHUNK_SIZE) {
          current = para;
        } else {
          for (let i = 0; i < para.length; i += CHUNK_SIZE) {
            chunks.push(para.slice(i, i + CHUNK_SIZE));
          }
          current = "";
        }
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  async embedDocument(documentId: string, organizationId: string) {
    const doc = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, organizationId },
      select: { id: true, rawContent: true },
    });
    if (!doc?.rawContent?.trim()) {
      await this.prisma.knowledgeChunk.deleteMany({ where: { documentId } });
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: "active" },
      });
      return { chunks: 0 };
    }

    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      this.logger.debug("OPENAI_API_KEY not set — skipping knowledge embedding");
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: "active" },
      });
      return { chunks: 0, skipped: true };
    }

    const pieces = this.splitIntoChunks(doc.rawContent);
    await this.prisma.knowledgeChunk.deleteMany({ where: { documentId } });

    const model = this.config.get<string>("AI_EMBEDDING_MODEL") ?? "text-embedding-3-small";
    let indexed = 0;

    for (const content of pieces) {
      const vector = await this.createEmbedding(apiKey, model, content);
      if (!vector) continue;

      const id = `kc_${randomBytes(8).toString("hex")}`;
      const vectorLiteral = `[${vector.join(",")}]`;

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO knowledge_chunks (id, "documentId", content, metadata, embedding)
         VALUES ($1, $2, $3, '{}'::jsonb, $4::extensions.vector)`,
        id,
        documentId,
        content,
        vectorLiteral,
      );
      indexed += 1;
    }

    await this.prisma.knowledgeDocument.update({
      where: { id: documentId },
      data: { status: indexed > 0 ? "indexed" : "active" },
    });

    return { chunks: indexed };
  }

  async search(organizationId: string, query: string, limit = 5) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey || !query.trim()) return [];

    const model = this.config.get<string>("AI_EMBEDDING_MODEL") ?? "text-embedding-3-small";
    const vector = await this.createEmbedding(apiKey, model, query.trim());
    if (!vector) return [];

    const vectorLiteral = `[${vector.join(",")}]`;
    const take = Math.min(Math.max(limit, 1), 8);

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ content: string; title: string; similarity: number }>
    >(
      `SELECT kc.content, kd.title,
        1 - (kc.embedding <=> $1::extensions.vector) AS similarity
      FROM knowledge_chunks kc
      INNER JOIN knowledge_documents kd ON kd.id = kc."documentId"
      WHERE kd."organizationId" = $2
        AND kd.status IN ('active', 'indexed')
        AND kc.embedding IS NOT NULL
      ORDER BY kc.embedding <=> $1::vector
      LIMIT $3`,
      vectorLiteral,
      organizationId,
      take,
    );

    return rows.filter((r) => r.similarity > 0.2);
  }

  async chunkCount(documentId: string): Promise<number> {
    return this.prisma.knowledgeChunk.count({ where: { documentId } });
  }

  private async createEmbedding(
    apiKey: string,
    model: string,
    input: string,
  ): Promise<number[] | null> {
    try {
      const res = await fetchWithTimeout(
        "https://api.openai.com/v1/embeddings",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, input }),
        },
        20_000,
      );

      const body = (await res.json()) as {
        data?: Array<{ embedding?: number[] }>;
        error?: { message?: string };
      };

      if (!res.ok) {
        this.logger.warn(`Embedding failed: ${body.error?.message ?? res.status}`);
        return null;
      }

      return body.data?.[0]?.embedding ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Embedding request failed: ${message}`);
      return null;
    }
  }
}
