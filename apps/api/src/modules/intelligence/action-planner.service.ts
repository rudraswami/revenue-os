import { Injectable } from "@nestjs/common";
import type {
  AiClassificationResult,
  KnowledgeCategory,
  KnowledgeHit,
  ProposedAction,
} from "@growvisi/shared";
import { HOT_LEAD_SCORE_THRESHOLD } from "@growvisi/shared";
import type { ConversationContext } from "./context-builder.service";

const PRICING_TOPIC =
  /pric|cost|fee|rate|package|₹|rs\.?\s*\d|discount|quote|emi|payment/i;

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
  automationPrefs: {
    stage: boolean;
    notify: boolean;
    handoff: boolean;
  };
}

@Injectable()
export class ActionPlannerService {
  detectKnowledgeGap(ctx: ConversationContext, knowledgeHits: KnowledgeHit[]): boolean {
    const topic = `${ctx.lastInbound ?? ""} ${ctx.ragQuery}`;
    if (!PRICING_TOPIC.test(topic)) return false;
    return knowledgeHits.length === 0;
  }

  applyKnowledgeGapGuard(
    result: AiClassificationResult,
    hasGap: boolean,
  ): AiClassificationResult {
    if (!hasGap) return result;
    return {
      ...result,
      requiresHuman: true,
      intent: result.intent?.includes("knowledge") ? result.intent : "Knowledge gap — pricing/policy",
      suggestedActions: [
        "Add pricing or policy to Business Knowledge in Settings",
        ...(result.suggestedActions ?? []).slice(0, 1),
      ],
    };
  }

  buildFromClassification(input: ClassificationPlanInput): ProposedAction[] {
    const actions: ProposedAction[] = [];
    const { ctx, result, aiRunId, stageChanged, score, automationPrefs } = input;

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

    if (
      ctx.conversation.aiEnabled &&
      !result.requiresHuman &&
      !input.lockHandoff &&
      input.handoffType !== "knowledge_gap"
    ) {
      actions.push({
        type: "reply.draft",
        executor: "growvisi",
        payload: {
          conversationId: ctx.conversationId,
          leadId: ctx.leadId,
          defer: true,
        },
        aiRunId,
      });
    }

    return actions;
  }

  knowledgeGapTopics(hits: KnowledgeHit[], ctx: ConversationContext): string[] {
    if (hits.length > 0) return [];
    const topic = `${ctx.lastInbound ?? ""}`;
    if (PRICING_TOPIC.test(topic)) return ["pricing or packages"];
    return [];
  }
}
