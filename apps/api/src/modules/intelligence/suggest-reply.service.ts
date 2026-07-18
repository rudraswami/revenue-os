import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JwtPayload } from "@growvisi/shared";
import { fetchWithTimeout } from "../../common/http/fetch-with-timeout";
import { EntitlementsService } from "../billing/entitlements.service";
import { KnowledgeRetrievalService } from "../knowledge/knowledge-retrieval.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { ContextBuilderService } from "./context-builder.service";

export interface DraftReplyResult {
  suggestion: string;
  sources: Array<{
    chunkId: string;
    title: string;
    similarity: number;
    citation: string;
  }>;
  usedRag: boolean;
  aiRunId: string;
}

@Injectable()
export class SuggestReplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly knowledge: KnowledgeRetrievalService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async suggest(user: JwtPayload, conversationId: string) {
    await this.entitlements.assertHasAccess(user.organizationId);
    return this.generateDraft(user.organizationId, conversationId);
  }

  /** Generate a draft reply and persist on the conversation for AI-assist mode. */
  async generateAndStoreDraft(
    organizationId: string,
    conversationId: string,
  ): Promise<DraftReplyResult | null> {
    try {
      const draft = await this.generateDraft(organizationId, conversationId);
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: conversationId, organizationId },
        select: { metadata: true },
      });
      if (!conversation) return draft;

      const meta =
        conversation.metadata && typeof conversation.metadata === "object"
          ? (conversation.metadata as Record<string, unknown>)
          : {};

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          metadata: {
            ...meta,
            pendingDraft: {
              suggestion: draft.suggestion,
              sources: draft.sources,
              aiRunId: draft.aiRunId,
              createdAt: new Date().toISOString(),
            },
          },
        },
      });

      this.realtime.emitInboxUpdated(organizationId);
      return draft;
    } catch {
      return null;
    }
  }

  async clearPendingDraft(conversationId: string, organizationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      select: { metadata: true },
    });
    if (!conversation) return;

    const meta =
      conversation.metadata && typeof conversation.metadata === "object"
        ? (conversation.metadata as Record<string, unknown>)
        : {};
    if (!meta.pendingDraft) return;

    const { pendingDraft: _removed, ...rest } = meta;
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { metadata: rest as object },
    });
  }

  private async generateDraft(
    organizationId: string,
    conversationId: string,
  ): Promise<DraftReplyResult> {
    await this.entitlements.assertHasAccess(organizationId);

    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      throw new BadRequestException("Smart replies are not available on this workspace.");
    }

    const ctx = await this.contextBuilder.buildForConversation(
      organizationId,
      conversationId,
      12,
    );

    const ragQuery =
      ctx.messages
        .slice(-4)
        .map((m) => m.content)
        .filter(Boolean)
        .join(" ") ||
      ctx.lastInbound ||
      "customer inquiry";

    const hits = await this.knowledge.retrieve({
      organizationId,
      query: ragQuery,
      limit: 5,
    });

    let knowledgeBlock = hits.length
      ? hits.map((h) => `### ${h.title}\n${h.content}`).join("\n\n")
      : "";

    if (!knowledgeBlock) {
      const fallback = await this.knowledge.fallbackDocuments(organizationId, 3);
      knowledgeBlock = fallback
        .map((d) => `### ${d.title}\n${(d.rawContent ?? "").slice(0, 800)}`)
        .join("\n\n");
    }

    const memoryBlock = this.contextBuilder.formatObservedMemoryBlock(ctx.observedMemory);
    const model = this.config.get<string>("AI_CHAT_MODEL") ?? "gpt-4o-mini";
    const started = Date.now();

    const aiRun = await this.prisma.aiRun.create({
      data: {
        organizationId,
        conversationId,
        type: "suggest_reply",
        provider: "openai",
        model,
        status: "RUNNING",
        input: { ragQuery, hitCount: hits.length, auto: true },
      },
    });

    try {
      const res = await fetchWithTimeout(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.4,
            max_tokens: 180,
            messages: [
              {
                role: "system",
                content: [
                  "You draft WhatsApp replies for a sales team. Write one short, warm, professional message. Plain text only. No quotes or labels.",
                  "The human rep will review and send — never imply the message was already sent.",
                  "Do not invent pricing, policies, or offers beyond the business knowledge provided.",
                  knowledgeBlock
                    ? `Business knowledge (use when relevant):\n\n${knowledgeBlock}`
                    : "",
                  memoryBlock
                    ? `What we know about this customer:\n${memoryBlock}`
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n\n"),
              },
              {
                role: "user",
                content: `Draft the next reply.\n\n${ctx.transcript}`,
              },
            ],
          }),
        },
        25_000,
      );

      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        error?: { message?: string };
      };

      if (!res.ok) {
        throw new BadRequestException(body.error?.message ?? "Could not generate a suggestion.");
      }

      const suggestion = body.choices?.[0]?.message?.content?.trim();
      if (!suggestion) {
        throw new BadRequestException("No suggestion returned.");
      }

      const latencyMs = Date.now() - started;
      const sources = hits.map((h) => ({
        chunkId: h.chunkId,
        title: h.title,
        similarity: h.similarity,
        citation: h.citation,
      }));

      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: {
          status: "COMPLETED",
          output: { suggestion, sources, usedRag: hits.length > 0 } as object,
          inputTokens: body.usage?.prompt_tokens,
          outputTokens: body.usage?.completion_tokens,
          latencyMs,
          completedAt: new Date(),
        },
      });

      return {
        suggestion,
        sources,
        usedRag: hits.length > 0,
        aiRunId: aiRun.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await this.prisma.aiRun.update({
        where: { id: aiRun.id },
        data: { status: "FAILED", error: message, completedAt: new Date() },
      });
      throw error;
    }
  }
}
