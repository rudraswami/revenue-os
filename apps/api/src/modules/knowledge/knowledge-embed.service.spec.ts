import { ConfigService } from "@nestjs/config";
import { KnowledgeEmbedService } from "./knowledge-embed.service";
import { PrismaService } from "../prisma/prisma.service";

describe("KnowledgeEmbedService", () => {
  const prisma = {
    knowledgeDocument: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    knowledgeChunk: {
      deleteMany: jest.fn(),
    },
    $executeRawUnsafe: jest.fn(),
  } as unknown as PrismaService;

  const config = {
    get: jest.fn((key: string) => {
      if (key === "OPENAI_API_KEY") return "sk-test";
      if (key === "AI_EMBEDDING_MODEL") return "text-embedding-3-small";
      return undefined;
    }),
  } as unknown as ConfigService;

  const service = new KnowledgeEmbedService(prisma, config);

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "upstream error" } }),
    }) as jest.Mock;
  });

  it("splits long paragraphs into chunks", () => {
    const chunks = service.splitIntoChunks("a".repeat(1200));
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("marks document failed when all embeddings fail", async () => {
    (prisma.knowledgeDocument.findFirst as jest.Mock).mockResolvedValue({
      id: "doc_1",
      rawContent: "Refund policy within 7 days.",
      title: "Policy",
      category: "general",
    });

    const result = await service.embedDocument("doc_1", "org_1");

    expect(result.failed).toBe(true);
    expect(prisma.knowledgeDocument.update).toHaveBeenCalledWith({
      where: { id: "doc_1" },
      data: { status: "failed" },
    });
  });
});
