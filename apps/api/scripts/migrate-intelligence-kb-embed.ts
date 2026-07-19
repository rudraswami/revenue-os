/**
 * Index knowledge_documents created by migration_starter (chunk + embed).
 * Usage: cd apps/api && npx tsx scripts/migrate-intelligence-kb-embed.ts
 */
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";

const CHUNK_SIZE = 900;
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } },
});

function splitIntoChunks(text: string): string[] {
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

async function createEmbedding(apiKey: string, model: string, input: string): Promise<number[] | null> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input }),
  });
  const body = (await res.json()) as {
    data?: Array<{ embedding?: number[] }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    console.error(`Embedding failed: ${body.error?.message ?? res.status}`);
    return null;
  }
  return body.data?.[0]?.embedding ?? null;
}

async function embedDocument(
  apiKey: string,
  model: string,
  documentId: string,
  organizationId: string,
): Promise<number> {
  const doc = await prisma.knowledgeDocument.findFirst({
    where: { id: documentId, organizationId },
    select: { id: true, rawContent: true, title: true, category: true },
  });
  if (!doc?.rawContent?.trim()) return 0;

  const pieces = splitIntoChunks(doc.rawContent);
  await prisma.knowledgeChunk.deleteMany({ where: { documentId } });

  let indexed = 0;
  for (const content of pieces) {
    const vector = await createEmbedding(apiKey, model, content);
    if (!vector) continue;

    const id = `kc_${randomBytes(8).toString("hex")}`;
    const vectorLiteral = `[${vector.join(",")}]`;
    const metadata = JSON.stringify({
      category: doc.category ?? "general",
      documentTitle: doc.title,
    });

    await prisma.$executeRawUnsafe(
      `INSERT INTO knowledge_chunks (id, "documentId", content, metadata, embedding)
       VALUES ($1, $2, $3, $4::jsonb, $5::extensions.vector)`,
      id,
      documentId,
      content,
      metadata,
      vectorLiteral,
    );
    indexed += 1;
  }

  await prisma.knowledgeDocument.update({
    where: { id: documentId },
    data: { status: indexed > 0 ? "indexed" : "active" },
  });

  return indexed;
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY required to embed starter knowledge.");
    process.exit(1);
  }

  const model = process.env.AI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const pending = await prisma.knowledgeDocument.findMany({
    where: { sourceType: "migration_starter", status: "pending" },
    select: { id: true, organizationId: true, title: true },
  });

  if (pending.length === 0) {
    console.log("No pending migration_starter documents.");
    return;
  }

  for (const doc of pending) {
    const chunks = await embedDocument(apiKey, model, doc.id, doc.organizationId);
    console.log(`Indexed ${doc.title} (${doc.organizationId}): ${chunks} chunk(s)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
