import { Injectable } from "@nestjs/common";
import type {
  AiClassificationResult,
  ExecutionPath,
  IntelligenceWorkspaceSettings,
  KnowledgeHit,
  ProposedAction,
  ReplyDecision,
  ReplyAutonomyMode,
} from "@growvisi/shared";
import { HOT_LEAD_SCORE_THRESHOLD, detectMissingTopics } from "@growvisi/shared";
import type { ConversationContext } from "./context-builder.service";
import { ReplyPolicyService } from "./reply-policy.service";

export interface ClassificationPlanInput {
  ctx: ConversationContext;
  result: AiClassificationResult;
  knowledgeHits: KnowledgeHit[];
  aiRunId: string;
  autoStageEnabled: boolean;
  lockStage: boolean;
  lockHandoff: boolean;
  stageChanged: boolean;
  score: number;
  handoffType?: "complex" | "knowledge_gap" | "human_request";
  workspaceAutonomy: ReplyAutonomyMode;
  intelligenceSettings: IntelligenceWorkspaceSettings;
  withinReplyWindow: boolean;
  autoSendPlanOk: boolean;
  executionPath: ExecutionPath;
  safetyBlocked?: { code: string; reason: string };
  hasIndexedChunks?: boolean;
  groundingConfidence?: number;
  automationPrefs: {
    stage: boolean;
    notify: boolean;
    handoff: boolean;
  };
}

@Injectable()
export class ActionPlannerService {
  constructor(private readonly replyPolicy: ReplyPolicyService) {}
  detectKnowledgeGap(
    ctx: ConversationContext,
    knowledgeHits: KnowledgeHit[],
    opts?: {
      intentKind?: string;
      classification?: Pick<AiClassificationResult, "customerNeeds">;
      hasIndexedChunks?: boolean;
    },
  ): boolean {
    return (
      detectMissingTopics({
        intentKind: opts?.intentKind,
        lastInbound: ctx.lastInbound,
        customerNeeds: opts?.classification?.customerNeeds,
        hits: knowledgeHits,
        hasIndexedChunks: opts?.hasIndexedChunks ?? true,
      }).length > 0
    );
  }

  applyKnowledgeGapGuard(
    result: AiClassificationResult,
    hasGap: boolean,
  ): AiClassificationResult {
    if (!hasGap) return result;
    return {
      ...result,
      intent: result.intent?.includes("knowledge") ? result.intent : "Knowledge gap — pricing/policy",
      suggestedActions: [
        "Add pricing or policy to Business Knowledge in Intelligence",
        ...(result.suggestedActions ?? []).slice(0, 1),
      ],
    };
  }

  buildFromClassification(input: ClassificationPlanInput): {
    actions: ProposedAction[];
    replyDecision: ReplyDecision;
  } {
    const actions: ProposedAction[] = [];
    const { ctx, result, aiRunId, stageChanged, score, automationPrefs } = input;

    const replyDecision = this.replyPolicy.evaluate({
      ctx,
      classification: result,
      knowledgeHits: input.knowledgeHits,
      knowledgeGap: input.handoffType === "knowledge_gap",
      workspaceAutonomy: input.workspaceAutonomy,
      intelligenceSettings: input.intelligenceSettings,
      withinReplyWindow: input.withinReplyWindow,
      autoSendPlanOk: input.autoSendPlanOk,
      executionPath: input.executionPath,
      safetyBlocked: input.safetyBlocked,
      hasIndexedChunks: input.hasIndexedChunks,
      groundingConfidence: input.groundingConfidence,
    });

    if (result.requiresHuman && !input.lockHandoff) {
      actions.push({
        type: "conversation.set_handoff",
        executor: "growvisi",
        payload: {
          conversationId: ctx.conversationId,
          leadId: ctx.leadId,
          reason: result.intent,
          handoffType: input.handoffType ?? "complex",
        },
        aiRunId,
      });

      actions.push({
        type: "conversation.assign",
        executor: "growvisi",
        payload: {
          conversationId: ctx.conversationId,
          leadId: ctx.leadId,
          handoff: true,
          reason: result.intent,
        },
        aiRunId,
      });

      if (automationPrefs.handoff) {
        actions.push({
          type: "email.send",
          executor: "automation",
          payload: {
            kind: "handoff",
            conversationId: ctx.conversationId,
            leadId: ctx.leadId,
            leadName: ctx.lead.displayName,
            leadPhone: ctx.lead.phone,
            reason: result.intent || result.summary || "Handoff required",
          },
          aiRunId,
        });
      }
    }

    if (stageChanged) {
      actions.push({
        type: "webhook.emit",
        executor: "growvisi",
        payload: {
          event: "lead.stage.changed",
          leadId: ctx.leadId,
          fromStage: ctx.lead.stage,
          toStage: result.stage,
        },
        aiRunId,
      });
    }

    if (
      automationPrefs.notify &&
      score >= HOT_LEAD_SCORE_THRESHOLD &&
      !result.requiresHuman
    ) {
      actions.push({
        type: "email.send",
        executor: "automation",
        payload: {
          kind: "hot_lead",
          conversationId: ctx.conversationId,
          leadId: ctx.leadId,
          leadName: ctx.lead.displayName,
          leadPhone: ctx.lead.phone,
          score,
          stageChanged,
          newStage: result.stage,
        },
        aiRunId,
      });
    }

    if (replyDecision.mode === "send") {
      actions.push({
        type: "reply.send",
        executor: "growvisi",
        payload: {
          conversationId: ctx.conversationId,
          leadId: ctx.leadId,
          knowledgeGap: input.handoffType === "knowledge_gap",
          replyDecision,
        },
        aiRunId,
      });
    } else {
      const humanAckOnly =
        Boolean(replyDecision.acknowledgmentText) &&
        replyDecision.blockers?.some((b) =>
          ["sensitive_topic", "needs_human"].includes(b),
        );

      if (
        replyDecision.acknowledgmentText &&
        input.workspaceAutonomy === "auto_guarded" &&
        input.autoSendPlanOk &&
        input.withinReplyWindow
      ) {
        actions.push({
          type: "reply.send",
          executor: "growvisi",
          payload: {
            conversationId: ctx.conversationId,
            leadId: ctx.leadId,
            fastReplyText: replyDecision.acknowledgmentText,
            replyDecision: {
              ...replyDecision,
              mode: "send",
              risk: "low",
              reasons: [
                ...replyDecision.reasons,
                "Sent holding message from your business profile.",
              ],
            },
          },
          aiRunId,
        });
      }

      if (replyDecision.mode === "draft" && !humanAckOnly) {
        actions.push({
          type: "reply.draft",
          executor: "growvisi",
          payload: {
            conversationId: ctx.conversationId,
            leadId: ctx.leadId,
            defer: true,
            knowledgeGap: input.handoffType === "knowledge_gap",
            replyDecision,
          },
          aiRunId,
        });
      }
    }

    return { actions, replyDecision };
  }

  knowledgeGapTopics(
    hits: KnowledgeHit[],
    ctx: ConversationContext,
    opts?: {
      intentKind?: string;
      classification?: Pick<AiClassificationResult, "customerNeeds">;
      hasIndexedChunks?: boolean;
    },
  ): string[] {
    return detectMissingTopics({
      intentKind: opts?.intentKind,
      lastInbound: ctx.lastInbound,
      customerNeeds: opts?.classification?.customerNeeds,
      hits,
      hasIndexedChunks: opts?.hasIndexedChunks ?? true,
    });
  }
}
