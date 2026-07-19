import { Injectable } from "@nestjs/common";
import type { AiClassificationResult } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { ConversationContext } from "./context-builder.service";

@Injectable()
export class ObservedMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async syncFromClassification(
    ctx: ConversationContext,
    result: AiClassificationResult,
    aiRunId: string,
  ) {
    const writes: Array<Promise<unknown>> = [];

    if (result.summary?.trim()) {
      writes.push(this.upsertSummary(ctx.conversationId, result.summary.trim(), aiRunId));
    }

    if (result.intent?.trim()) {
      writes.push(
        this.upsertFact(ctx.conversationId, `Intent: ${result.intent.trim()}`, {
          key: "intent",
          source: "ai",
          aiRunId,
        }),
      );
    }

    if (result.nextAction?.trim()) {
      writes.push(
        this.upsertFact(ctx.conversationId, `Next action: ${result.nextAction.trim()}`, {
          key: "next_action",
          source: "ai",
          aiRunId,
        }),
      );
    }

    for (const tag of result.tags ?? []) {
      const clean = tag.trim();
      if (!clean) continue;
      writes.push(
        this.upsertFact(ctx.conversationId, `Tag: ${clean}`, {
          key: `tag:${clean.toLowerCase()}`,
          source: "ai",
          aiRunId,
        }),
      );
    }

    const entities = result.entities;
    if (entities?.product?.trim()) {
      writes.push(
        this.upsertFact(ctx.conversationId, `Product: ${entities.product.trim()}`, {
          key: "entity:product",
          source: "ai",
          aiRunId,
        }),
      );
    }
    if (entities?.budget?.trim()) {
      writes.push(
        this.upsertFact(ctx.conversationId, `Budget: ${entities.budget.trim()}`, {
          key: "entity:budget",
          source: "ai",
          aiRunId,
        }),
      );
    }
    if (entities?.location?.trim()) {
      writes.push(
        this.upsertFact(ctx.conversationId, `Location: ${entities.location.trim()}`, {
          key: "entity:location",
          source: "ai",
          aiRunId,
        }),
      );
    }
    if (entities?.quantity?.trim()) {
      writes.push(
        this.upsertFact(ctx.conversationId, `Quantity: ${entities.quantity.trim()}`, {
          key: "entity:quantity",
          source: "ai",
          aiRunId,
        }),
      );
    }

    if (result.language) {
      writes.push(
        this.upsertFact(ctx.conversationId, `Language: ${result.language}`, {
          key: "language",
          source: "ai",
          aiRunId,
        }),
      );
    }

    await Promise.all(writes);
  }

  async recordHumanCorrection(
    conversationId: string,
    input: {
      intent?: string;
      note?: string;
      stage?: string;
      score?: number;
      correctionId: string;
    },
  ) {
    const writes: Array<Promise<unknown>> = [];

    if (input.intent?.trim()) {
      writes.push(
        this.upsertFact(conversationId, `Intent (corrected): ${input.intent.trim()}`, {
          key: "intent",
          source: "human",
          correctionId: input.correctionId,
        }),
      );
    }

    if (input.note?.trim()) {
      writes.push(
        this.createMemory(conversationId, "fact", input.note.trim(), {
          key: "correction_note",
          source: "human",
          correctionId: input.correctionId,
        }),
      );
    }

    if (input.stage) {
      writes.push(
        this.upsertFact(conversationId, `Stage (corrected): ${input.stage}`, {
          key: "stage",
          source: "human",
          correctionId: input.correctionId,
        }),
      );
    }

    await Promise.all(writes);
  }

  async listForConversation(conversationId: string) {
    const rows = await this.prisma.conversationMemory.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return rows.map((m) => {
      const meta =
        m.metadata && typeof m.metadata === "object"
          ? (m.metadata as Record<string, unknown>)
          : {};
      return {
        id: m.id,
        type: m.type,
        content: m.content,
        source: typeof meta.source === "string" ? meta.source : "system",
        createdAt: m.createdAt.toISOString(),
      };
    });
  }

  private async upsertSummary(conversationId: string, summary: string, aiRunId: string) {
    const existing = await this.prisma.conversationMemory.findFirst({
      where: { conversationId, type: "summary" },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return this.prisma.conversationMemory.update({
        where: { id: existing.id },
        data: {
          content: summary,
          metadata: { source: "ai", aiRunId },
        },
      });
    }

    return this.createMemory(conversationId, "summary", summary, { source: "ai", aiRunId });
  }

  private async upsertFact(
    conversationId: string,
    content: string,
    metadata: Record<string, unknown>,
  ) {
    const key = typeof metadata.key === "string" ? metadata.key : null;
    if (key) {
      const existing = await this.prisma.conversationMemory.findFirst({
        where: {
          conversationId,
          type: "fact",
          metadata: { path: ["key"], equals: key },
        },
      });
      if (existing) {
        return this.prisma.conversationMemory.update({
          where: { id: existing.id },
          data: { content, metadata: metadata as object },
        });
      }
    }

    return this.createMemory(conversationId, "fact", content, metadata);
  }

  private createMemory(
    conversationId: string,
    type: string,
    content: string,
    metadata: Record<string, unknown>,
  ) {
    return this.prisma.conversationMemory.create({
      data: {
        conversationId,
        type,
        content: content.slice(0, 500),
        metadata: metadata as object,
      },
    });
  }
}
