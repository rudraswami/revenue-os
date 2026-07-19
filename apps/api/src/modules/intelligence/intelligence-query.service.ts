import { Injectable } from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ContextBuilderService } from "./context-builder.service";
import { resolveReplyIntentKind } from "./reply-intent";
import { KnowledgeRetrievalService } from "../knowledge/knowledge-retrieval.service";
import { ObservedMemoryService } from "./observed-memory.service";
import { LearningSignalService } from "./learning-signal.service";

@Injectable()
export class IntelligenceQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly memory: ObservedMemoryService,
    private readonly knowledge: KnowledgeRetrievalService,
    private readonly learning: LearningSignalService,
  ) {}

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
    const replyDecision =
      meta.replyDecision && typeof meta.replyDecision === "object"
        ? (meta.replyDecision as import("@growvisi/shared").ReplyDecision)
        : null;

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
      replyDecision,
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
    const stored =
      meta.replyDecision && typeof meta.replyDecision === "object"
        ? (meta.replyDecision as import("@growvisi/shared").ReplyDecision)
        : null;

    if (stored) return { replyDecision: stored };

    return { replyDecision: null };
  }
}
