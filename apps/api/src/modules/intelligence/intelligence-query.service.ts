import { Injectable } from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ActionPlannerService } from "./action-planner.service";
import { ContextBuilderService } from "./context-builder.service";
import { KnowledgeRetrievalService } from "../knowledge/knowledge-retrieval.service";
import { ObservedMemoryService } from "./observed-memory.service";

@Injectable()
export class IntelligenceQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly memory: ObservedMemoryService,
    private readonly knowledge: KnowledgeRetrievalService,
    private readonly planner: ActionPlannerService,
  ) {}

  async getConversationIntelligence(user: JwtPayload, conversationId: string) {
    const ctx = await this.contextBuilder.buildForConversation(
      user.organizationId,
      conversationId,
      8,
    );

    const hits = await this.knowledge.retrieve({
      organizationId: user.organizationId,
      query: ctx.ragQuery,
      limit: 4,
    });

    const plan = await this.prisma.actionPlan.findFirst({
      where: { organizationId: user.organizationId, conversationId },
      orderBy: { createdAt: "desc" },
      include: { actions: { orderBy: { createdAt: "asc" } } },
    });

    const observedMemory = await this.memory.listForConversation(conversationId);

    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: user.organizationId },
      select: { metadata: true },
    });
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
            classification:
              plan.classification && typeof plan.classification === "object"
                ? plan.classification
                : null,
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
      knowledgeGaps: this.planner.knowledgeGapTopics(hits, ctx),
      replyDecision,
    };
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
