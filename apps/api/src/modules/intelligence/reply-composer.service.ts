import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ReplyDecision, ReplyRiskLevel } from "@growvisi/shared";
import { fetchWithTimeout } from "../../common/http/fetch-with-timeout";
import { EntitlementsService } from "../billing/entitlements.service";
import { KnowledgeRetrievalService } from "../knowledge/knowledge-retrieval.service";
import { PrismaService } from "../prisma/prisma.service";
import { ContextBuilderService } from "./context-builder.service";

export interface ComposedReply {
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

export interface ComposeReplyInput {
  organizationId: string;
  conversationId: string;
  decision?: ReplyDecision;
  knowledgeGap?: boolean;
  manual?: boolean;
}

@Injectable()
export class ReplyComposerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly knowledge: KnowledgeRetrievalService,
  ) {}

  async compose(input: ComposeReplyInput): Promise<ComposedReply> {
    await this.entitlements.assertHasAccess(input.organizationId);

    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      throw new BadRequestException("Smart replies are not available on this workspace.");
    }

    const ctx = await this.contextBuilder.buildForConversation(
      input.organizationId,
      input.conversationId,
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
      organizationId: input.organizationId,
      query: ragQuery,
      limit: 5,
    });

    let knowledgeBlock = hits.length
      ? hits.map((h) => `### ${h.title}\n${h.content}`).join("\n\n")
      : "";

    if (!knowledgeBlock) {
      const fallback = await this.knowledge.fallbackDocuments(input.organizationId, 3);
      knowledgeBlock = fallback
        .map((d) => `### ${d.title}\n${(d.rawContent ?? "").slice(0, 800)}`)
        .join("\n\n");
    }

    const memoryBlock = this.contextBuilder.formatObservedMemoryBlock(ctx.observedMemory);
    const model = this.config.get<string>("AI_CHAT_MODEL") ?? "gpt-4o-mini";
    const started = Date.now();
    const risk = input.decision?.risk ?? (input.knowledgeGap ? "high" : "medium");

    const aiRun = await this.prisma.aiRun.create({
      data: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        type: "suggest_reply",
        provider: "openai",
        model,
        status: "RUNNING",
        input: {
          ragQuery,
          hitCount: hits.length,
          auto: !input.manual,
          risk,
        },
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
            temperature: risk === "low" ? 0.35 : 0.4,
            max_tokens: 200,
            messages: [
              {
                role: "system",
                content: this.systemPrompt({
                  knowledgeBlock,
                  memoryBlock,
                  knowledgeGap: Boolean(input.knowledgeGap),
                  risk,
                }),
              },
              {
                role: "user",
                content: `Draft the next WhatsApp reply.\n\n${ctx.transcript}`,
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
          output: { suggestion, sources, usedRag: hits.length > 0, risk } as object,
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

  private systemPrompt(opts: {
    knowledgeBlock: string;
    memoryBlock: string;
    knowledgeGap: boolean;
    risk: ReplyRiskLevel;
  }): string {
    return [
      "You draft WhatsApp replies for a sales team. Write one short, warm, professional message. Plain text only. No quotes or labels.",
      "The human rep will review and send — never imply the message was already sent.",
      "Do not invent pricing, policies, or offers beyond the business knowledge provided.",
      opts.risk === "high"
        ? "This is a sensitive thread — be careful, empathetic, and avoid committing to prices or policies. Draft a starting point a teammate can edit."
        : "",
      opts.knowledgeGap
        ? "No matching pricing/policy docs were found. Ask clarifying questions (budget, scope, timeline) without quoting specific prices."
        : "",
      opts.knowledgeBlock
        ? `Business knowledge (use when relevant):\n\n${opts.knowledgeBlock}`
        : "",
      opts.memoryBlock ? `What we know about this customer:\n${opts.memoryBlock}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }
}
