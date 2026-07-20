import { Injectable } from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { computeGapRiskScore } from "@growvisi/shared";
import type { Conversation, ConversationMemory, Lead, Message } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ContextBuilderService } from "./context-builder.service";
import { resolveReplyIntentKind } from "./reply-intent";
import { KnowledgeRetrievalService } from "../knowledge/knowledge-retrieval.service";
import { ObservedMemoryService } from "./observed-memory.service";
import { LearningSignalService } from "./learning-signal.service";

function readReplyDecision(meta: Record<string, unknown>) {
  return meta.replyDecision && typeof meta.replyDecision === "object"
    ? (meta.replyDecision as import("@growvisi/shared").ReplyDecision)
    : null;
}

@Injectable()
export class IntelligenceQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly memory: ObservedMemoryService,
    private readonly knowledge: KnowledgeRetrievalService,
    private readonly learning: LearningSignalService,
  ) {}

  /**
   * Fast inbox sidebar context — no workspace metrics, RAG, or action-plan fan-out.
   */
  async getConversationInboxContext(user: JwtPayload, conversationId: string) {
    const ctx = await this.contextBuilder.buildForConversation(
      user.organizationId,
      conversationId,
    );

    const chunkCount = await this.knowledge.getCachedChunkCount(user.organizationId);
    return this.formatInboxContext(ctx, chunkCount);
  }

  /** TB-1: inbox context from preloaded conversation + messages (thread bundle). */
  async buildInboxContextForBundle(
    organizationId: string,
    conversation: Conversation & { lead: Lead | null },
    messages: Message[],
    memories: ConversationMemory[],
  ) {
    const ctx = this.contextBuilder.assembleFromLoaded(
      organizationId,
      conversation,
      messages,
      memories,
    );
    const chunkCount = await this.knowledge.getCachedChunkCount(organizationId);
    return this.formatInboxContext(ctx, chunkCount);
  }

  private formatInboxContext(
    ctx: Awaited<ReturnType<ContextBuilderService["buildForConversation"]>>,
    chunkCount: number,
  ) {
    const meta = ctx.conversation.metadata ?? {};

    return {
      workingMemory: ctx.workingMemory,
      replyDecision: readReplyDecision(meta),
      kbHealth: {
        docCount: 0,
        chunkCount,
        lastIndexedAt: null,
        gapRiskScore: computeGapRiskScore({ chunkCount, docCount: 0 }),
        readyForResponsivePreset: chunkCount > 0,
      },
    };
  }

  /**
   * Lazy KB gap check — runs vector retrieval only when inbox has indexed docs.
   */
  async getConversationKnowledgeGaps(user: JwtPayload, conversationId: string) {
    const chunkCount = await this.knowledge.getCachedChunkCount(user.organizationId);
    if (chunkCount === 0) {
      return { knowledgeGaps: [] as string[] };
    }

    const ctx = await this.contextBuilder.buildForConversation(
      user.organizationId,
      conversationId,
    );
    if (!ctx.lastInbound?.trim()) {
      return { knowledgeGaps: [] as string[] };
    }

    const plan = await this.prisma.actionPlan.findFirst({
      where: { organizationId: user.organizationId, conversationId },
      orderBy: { createdAt: "desc" },
      select: { classification: true },
    });

    const classification =
      plan?.classification && typeof plan.classification === "object"
        ? (plan.classification as unknown as import("@growvisi/shared").AiClassificationResult)
        : null;

    const retrieval = await this.knowledge.retrieveDetailed({
      organizationId: user.organizationId,
      query: ctx.ragQuery,
      limit: 4,
      intentKind: resolveReplyIntentKind(ctx.lastInbound, classification),
      lastInbound: ctx.lastInbound,
      customerNeeds: classification?.customerNeeds,
    });

    return { knowledgeGaps: retrieval.missingTopics };
  }

  /** Full intelligence payload — for dashboards; avoid on inbox thread open. */
  async getConversationIntelligence(user: JwtPayload, conversationId: string) {
    const ctx = await this.contextBuilder.buildForConversation(
      user.organizationId,
      conversationId,
    );

    const [plan, kbHealth, conv, autonomyMetrics] = await Promise.all([
      this.prisma.actionPlan.findFirst({
        where: { organizationId: user.organizationId, conversationId },
        orderBy: { createdAt: "desc" },
        include: { actions: { orderBy: { createdAt: "asc" } } },
      }),
      this.knowledge.getHealth(user.organizationId),
      this.prisma.conversation.findFirst({
        where: { id: conversationId, organizationId: user.organizationId },
        select: { metadata: true },
      }),
      this.learning.aggregateAutonomyMetrics(user.organizationId, 7),
    ]);

    const classification =
      plan?.classification && typeof plan.classification === "object"
        ? (plan.classification as unknown as import("@growvisi/shared").AiClassificationResult)
        : null;

    const retrieval = await this.knowledge.retrieveDetailed({
      organizationId: user.organizationId,
      query: ctx.ragQuery,
      limit: 4,
      intentKind: resolveReplyIntentKind(ctx.lastInbound, classification),
      lastInbound: ctx.lastInbound,
      customerNeeds: classification?.customerNeeds,
    });

    const observedMemory = await this.memory.listForConversation(conversationId);

    const meta =
      conv?.metadata && typeof conv.metadata === "object"
        ? (conv.metadata as Record<string, unknown>)
        : {};

    return {
      actionPlan: plan
        ? {
            id: plan.id,
            status: plan.status,
            confidence: plan.confidence,
            classification,
            actions: plan.actions.map((a) => ({
              id: a.id,
              type: a.type,
              status: a.status,
              payload:
                a.payload && typeof a.payload === "object"
                  ? (a.payload as Record<string, unknown>)
                  : {},
              result:
                a.result && typeof a.result === "object"
                  ? (a.result as Record<string, unknown>)
                  : null,
            })),
            createdAt: plan.createdAt.toISOString(),
          }
        : null,
      observedMemory,
      knowledgeGaps: retrieval.missingTopics,
      replyDecision: readReplyDecision(meta),
      customerNeeds: classification?.customerNeeds,
      workingMemory: ctx.workingMemory,
      kbHealth,
      autonomyMetrics,
    };
  }

  async getAutonomyMetrics(user: JwtPayload, periodDays = 7) {
    return this.learning.aggregateAutonomyMetrics(user.organizationId, periodDays);
  }

  async getReplyDecision(user: JwtPayload, conversationId: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: user.organizationId },
      select: { metadata: true, aiEnabled: true, lastInboundAt: true, lead: { select: { stage: true } } },
    });
    if (!conv) return { replyDecision: null };

    const meta =
      conv.metadata && typeof conv.metadata === "object"
        ? (conv.metadata as Record<string, unknown>)
        : {};
    const stored = readReplyDecision(meta);

    if (stored) return { replyDecision: stored };

    return { replyDecision: null };
  }
}
