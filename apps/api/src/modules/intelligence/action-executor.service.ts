import { Injectable, Logger } from "@nestjs/common";
import type { AiClassificationResult, LeadStage, ProposedAction, ReplyDecision } from "@growvisi/shared";
import { LEAD_STAGE_ORDER } from "@growvisi/shared";
import { AutomationsService } from "../automations/automations.service";
import { AssignmentService } from "../assignments/assignment.service";
import { WebhookDispatchService } from "../webhooks/webhook-dispatch.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { PrismaService } from "../prisma/prisma.service";
import type { ConversationContext } from "./context-builder.service";
import { SuggestReplyService } from "./suggest-reply.service";

const STAGE_SCORE: Record<LeadStage, number> = {
  NEW: 10,
  CONTACTED: 25,
  QUALIFIED: 50,
  PROPOSAL: 70,
  NEGOTIATION: 85,
  WON: 100,
  LOST: 0,
};

export interface ExecutePlanInput {
  organizationId: string;
  conversationId: string;
  leadId: string;
  correlationId?: string;
  triggerEventId?: string;
  classification: AiClassificationResult;
  actions: ProposedAction[];
  ctx: ConversationContext;
  stageChanged: boolean;
}

@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly automations: AutomationsService,
    private readonly assignments: AssignmentService,
    private readonly webhooks: WebhookDispatchService,
    private readonly suggestReply: SuggestReplyService,
  ) {}

  shouldUpdateStage(
    current: LeadStage,
    suggested: LeadStage,
    confidence: number,
  ): boolean {
    if (current === "WON" || current === "LOST") return false;
    if (confidence < 0.55) return false;
    if (suggested === "LOST" && confidence >= 0.65) return true;
    if (suggested === "WON" && confidence >= 0.75) return true;

    const currentIdx = LEAD_STAGE_ORDER.indexOf(current);
    const suggestedIdx = LEAD_STAGE_ORDER.indexOf(suggested);
    if (suggested === "LOST" || suggested === "WON") {
      return confidence >= 0.7;
    }
    return suggestedIdx > currentIdx;
  }

  computeScore(result: AiClassificationResult, preserveScore: boolean, currentScore: number) {
    if (preserveScore) return currentScore;
    return Math.max(STAGE_SCORE[result.stage], Math.round(result.confidence * 100));
  }

  async applyLeadProfileUpdate(
    organizationId: string,
    leadId: string,
    result: AiClassificationResult,
    opts: {
      updateStage: boolean;
      preserveScore: boolean;
      currentStage: LeadStage;
      currentScore: number;
      aiRunId: string;
    },
  ): Promise<boolean> {
    const score = this.computeScore(result, opts.preserveScore, opts.currentScore);

    const existing = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { profile: true },
    });
    const prevProfile =
      existing?.profile && typeof existing.profile === "object"
        ? (existing.profile as Record<string, unknown>)
        : {};

    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(opts.preserveScore ? {} : { score }),
        aiConfidence: result.confidence,
        lastClassifiedAt: new Date(),
        profile: {
          ...prevProfile,
          lastIntent: result.intent,
          lastSentiment: result.sentiment,
          suggestedActions: result.suggestedActions,
          summary: result.summary,
          nextAction: result.nextAction,
          aiTags: result.tags,
        },
        ...(opts.updateStage
          ? {
              stage: result.stage as never,
              wonAt: result.stage === "WON" ? new Date() : undefined,
              lostAt: result.stage === "LOST" ? new Date() : undefined,
            }
          : {}),
      },
    });

    if (result.tags?.length) {
      await this.autoAssignTags(organizationId, leadId, result.tags);
    }

    if (opts.updateStage) {
      await this.prisma.leadStageHistory.create({
        data: {
          leadId,
          fromStage: opts.currentStage as never,
          toStage: result.stage as never,
          reason: `AI: ${result.intent} (${Math.round(result.confidence * 100)}% confidence)`,
          aiRunId: opts.aiRunId,
        },
      });
      return true;
    }

    return false;
  }

  async executePlan(input: ExecutePlanInput) {
    const plan = await this.prisma.actionPlan.create({
      data: {
        organizationId: input.organizationId,
        correlationId: input.correlationId,
        triggerEventId: input.triggerEventId,
        conversationId: input.conversationId,
        leadId: input.leadId,
        status: "executing",
        confidence: input.classification.confidence,
        classification: input.classification as object,
      },
    });

    const results: Array<{ type: string; status: string }> = [];

    for (const action of input.actions) {
      const row = await this.prisma.action.create({
        data: {
          planId: plan.id,
          organizationId: input.organizationId,
          type: action.type,
          executor: action.executor,
          payload: action.payload as object,
          aiRunId: action.aiRunId,
          status: "pending",
        },
      });

      try {
        await this.executeOne(action, input);
        await this.prisma.action.update({
          where: { id: row.id },
          data: { status: "done", executedAt: new Date() },
        });
        results.push({ type: action.type, status: "done" });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Action ${action.type} failed: ${message}`);
        await this.prisma.action.update({
          where: { id: row.id },
          data: { status: "failed", result: { error: message } as object, executedAt: new Date() },
        });
        results.push({ type: action.type, status: "failed" });
      }
    }

    await this.prisma.actionPlan.update({
      where: { id: plan.id },
      data: {
        status: results.some((r) => r.status === "failed") ? "failed" : "completed",
        completedAt: new Date(),
      },
    });

    if (input.stageChanged) {
      this.realtime.emitLeadStageChanged(input.organizationId, {
        leadId: input.leadId,
        fromStage: input.ctx.lead.stage,
        toStage: input.classification.stage,
        confidence: input.classification.confidence,
      });
    }

    this.realtime.emitLeadClassified(input.organizationId, {
      leadId: input.leadId,
      conversationId: input.conversationId,
      stage: input.classification.stage,
      confidence: input.classification.confidence,
      stageChanged: input.stageChanged,
    });

    if (input.stageChanged) {
      this.realtime.emitInboxUpdated(input.organizationId, input.conversationId);
    } else if (input.actions.some((a) => a.type === "reply.draft")) {
      this.realtime.emitInboxUpdated(input.organizationId, input.conversationId);
    }

    return { planId: plan.id, results };
  }

  private async executeOne(action: ProposedAction, input: ExecutePlanInput) {
    const payload = action.payload;

    switch (action.type) {
      case "lead.update_score":
        return;

      case "lead.update_stage": {
        const updateStage = Boolean(payload.updateStage ?? true);
        if (!updateStage) return;
        return;
      }

      case "conversation.set_handoff": {
        const conversationId = String(payload.conversationId);
        const conv = await this.prisma.conversation.findUnique({
          where: { id: conversationId },
          select: { metadata: true },
        });
        const existingMeta =
          conv?.metadata && typeof conv.metadata === "object" ? conv.metadata : {};
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: {
            metadata: {
              ...(existingMeta as Record<string, unknown>),
              requiresHuman: true,
              handoffReason: String(payload.reason ?? "Handoff required"),
              handoffType: payload.handoffType ?? "complex",
              handoffAt: new Date().toISOString(),
            },
          },
        });
        this.realtime.emitLeadHandoff(input.organizationId, {
          conversationId,
          leadId: String(payload.leadId),
          reason: String(payload.reason ?? "Handoff required"),
        });
        return;
      }

      case "conversation.assign": {
        await this.assignments.applyAutoAssign(input.organizationId, {
          conversationId: String(payload.conversationId),
          leadId: String(payload.leadId),
          handoff: Boolean(payload.handoff),
          reason: typeof payload.reason === "string" ? payload.reason : undefined,
        });
        return;
      }

      case "task.create":
      case "email.send": {
        if (action.type === "email.send" && payload.kind === "handoff") {
          const conv = await this.prisma.conversation.findUnique({
            where: { id: String(payload.conversationId) },
            select: { assignedToId: true },
          });
          await this.automations.handleHandoff({
            organizationId: input.organizationId,
            conversationId: String(payload.conversationId),
            leadId: String(payload.leadId),
            leadName: (payload.leadName as string | null) ?? null,
            leadPhone: String(payload.leadPhone),
            reason: String(payload.reason ?? "Handoff required"),
            assigneeUserId: conv?.assignedToId,
          });
          return;
        }

        if (action.type === "email.send" && payload.kind === "hot_lead") {
          await this.automations.handlePostClassification({
            organizationId: input.organizationId,
            conversationId: String(payload.conversationId),
            leadId: String(payload.leadId),
            leadName: (payload.leadName as string | null) ?? null,
            leadPhone: String(payload.leadPhone),
            score: Number(payload.score),
            stageChanged: Boolean(payload.stageChanged),
            newStage: payload.newStage as LeadStage,
          });
        }
        return;
      }

      case "webhook.emit": {
        if (payload.event === "lead.stage.changed") {
          const lead = await this.prisma.lead.findUnique({
            where: { id: String(payload.leadId) },
            select: { phone: true, displayName: true },
          });
          void this.webhooks.emit(input.organizationId, "lead.stage.changed", {
            leadId: String(payload.leadId),
            fromStage: payload.fromStage,
            toStage: payload.toStage,
            phone: lead?.phone,
            displayName: lead?.displayName,
            isAi: true,
            at: new Date().toISOString(),
          });
        }
        return;
      }

      case "reply.draft": {
        const replyDecision = payload.replyDecision as ReplyDecision | undefined;
        const draft = await this.suggestReply.generateAndStoreDraft(
          input.organizationId,
          String(payload.conversationId),
          {
            knowledgeGap: payload.knowledgeGap === true,
            decision: replyDecision,
          },
        );
        return { draft: draft?.suggestion ?? null };
      }

      default:
        return;
    }
  }

  private async autoAssignTags(organizationId: string, leadId: string, tagNames: string[]) {
    for (const name of tagNames) {
      const clean = name.trim().toLowerCase().slice(0, 40);
      if (!clean) continue;
      try {
        const tag = await this.prisma.tag.upsert({
          where: { organizationId_name: { organizationId, name: clean } },
          create: { organizationId, name: clean, color: "#006c49" },
          update: {},
        });
        await this.prisma.leadTag.upsert({
          where: { leadId_tagId: { leadId, tagId: tag.id } },
          create: { leadId, tagId: tag.id },
          update: {},
        });
      } catch {
        // Tag creation can race — safe to skip
      }
    }
  }
}
