import { Injectable } from "@nestjs/common";
import type {
  AiClassificationResult,
  AutomationPolicyRules,
  BusinessEmployeeProfile,
  ExecutionPath,
  IntelligenceWorkspaceSettings,
  KnowledgeHit,
  ReplyRiskLevel,
} from "@growvisi/shared";
import {
  assessAnswerability,
  AUTOMATION_PRESET_DEFAULTS,
  assessCommercialSensitivity,
  defaultBusinessEmployeeProfile,
  isDiscountNegotiationMessage,
  isSimpleAck,
  isSimpleGreeting,
  isSimpleThanks,
  resolveProfileAcknowledgment,
  shouldApplyDealStageGate,
} from "@growvisi/shared";
import type { ConversationContext } from "./context-builder.service";
import {
  assessReplyRisk,
  isPricingInbound,
  isSensitiveInbound,
  resolveReplyIntentKind,
} from "./reply-intent";
import { classificationNeedsHuman } from "@growvisi/shared";

export type AutomationOutcome = "send" | "draft" | "human";

export interface AutomationPolicyInput {
  settings: IntelligenceWorkspaceSettings;
  ctx: ConversationContext;
  classification: AiClassificationResult;
  knowledgeHits: KnowledgeHit[];
  knowledgeGap: boolean;
  executionPath: ExecutionPath;
  humanHandling: boolean;
  /** When false, only courtesy auto-send is allowed — FAQ/pricing need indexed KB. */
  hasIndexedChunks?: boolean;
  /** 0–1 from retrieval pipeline */
  groundingConfidence?: number;
}

export interface AutomationPolicyResult {
  outcome: AutomationOutcome;
  risk: ReplyRiskLevel;
  reasons: string[];
  blockers: string[];
  /** Customer-facing holding message when a full auto-reply is blocked. */
  acknowledgment?: string;
}

@Injectable()
export class AutomationPolicyService {
  resolveRules(settings: IntelligenceWorkspaceSettings): AutomationPolicyRules {
    const preset = settings.automationPreset ?? "balanced";
    const base = AUTOMATION_PRESET_DEFAULTS[preset] ?? AUTOMATION_PRESET_DEFAULTS.balanced;
    return { ...base, ...settings.automationRules };
  }

  evaluate(input: AutomationPolicyInput): AutomationPolicyResult {
    const reasons: string[] = [];
    const blockers: string[] = [];
    const pushBlocker = (code: string, reason: string) => {
      if (!blockers.includes(code)) blockers.push(code);
      reasons.push(reason);
    };

    const profile =
      input.settings.businessProfile ??
      defaultBusinessEmployeeProfile("our team");

    const lastInbound = input.ctx.lastInbound?.trim() ?? "";
    const risk = assessReplyRisk({
      lastInbound,
      requiresHuman: classificationNeedsHuman(input.classification),
      knowledgeGap: input.knowledgeGap,
      knowledgeHitCount: input.knowledgeHits.length,
    });

    if (input.humanHandling) {
      pushBlocker("human_handling", "You're handling this thread — Growvisi won't message the customer.");
      return { outcome: "human", risk, reasons, blockers };
    }

    if (input.executionPath === "human" || input.classification.requiresHuman) {
      pushBlocker("needs_human", "Customer needs a person — your team should reply.");
      return this.withAck(profile, blockers, {
        outcome: "human",
        risk: "high",
        reasons,
        blockers,
      });
    }

    if (input.classification.requiresOwner) {
      pushBlocker("needs_owner", "Owner should handle this thread.");
      return this.withAck(profile, blockers, {
        outcome: "human",
        risk: "high",
        reasons,
        blockers,
      });
    }

    if (input.classification.recoveryMode) {
      pushBlocker("recovery_mode", "Recover trust — human should reply with care.");
      return this.withAck(profile, blockers, {
        outcome: "human",
        risk: "high",
        reasons,
        blockers,
      });
    }

    if (input.classification.apologyRequired) {
      pushBlocker("apology_required", "Customer needs empathy — draft for your review.");
      return { outcome: "draft", risk: "medium", reasons, blockers };
    }

    if (isSensitiveInbound(lastInbound)) {
      pushBlocker("sensitive_topic", "Sensitive topic — human should reply.");
      return this.withAck(profile, blockers, {
        outcome: "human",
        risk: "high",
        reasons,
        blockers,
      });
    }

    const rules = this.resolveRules(input.settings);
    const stage = input.ctx.lead.stage;
    const relationshipPhase = input.ctx.workingMemory.relationshipPhase;
    const intentKind = resolveReplyIntentKind(lastInbound, input.classification);
    const commercialSensitivity = assessCommercialSensitivity({
      relationshipPhase,
      stage,
      intentKind,
      lastInbound,
      dealTemperature: input.classification.dealTemperature,
    });

    const isCourtesy =
      input.executionPath === "fast" ||
      isSimpleGreeting(lastInbound) ||
      isSimpleThanks(lastInbound) ||
      isSimpleAck(lastInbound);

    // Courtesy replies bypass deal-stage gate (Hello still sends in Negotiation / post-sale).
    if (isCourtesy && rules.autoSendGreetings) {
      reasons.push("Simple courtesy reply — safe to send.");
      return { outcome: "send", risk: "low", reasons, blockers };
    }

    if (input.hasIndexedChunks === false && !isCourtesy) {
      pushBlocker(
        "kb_not_indexed",
        "Business Knowledge is not indexed yet — add docs in Settings → AI & replies before auto-answers.",
      );
      return this.withAck(profile, blockers, {
        outcome: "draft",
        risk: "medium",
        reasons,
        blockers,
      });
    }

    if (
      relationshipPhase === "post_sale" &&
      commercialSensitivity === "high"
    ) {
      pushBlocker(
        "post_sale_commercial",
        "Deal is closed — commercial replies need your review.",
      );
      return { outcome: "draft", risk: "medium", reasons, blockers };
    }

    if (
      relationshipPhase === "win_back" &&
      commercialSensitivity !== "low"
    ) {
      pushBlocker(
        "win_back_commercial",
        "Win-back opportunity — review before sending commercial details.",
      );
      return { outcome: "draft", risk: "medium", reasons, blockers };
    }

    if (
      shouldApplyDealStageGate({
        stage,
        humanForStages: rules.humanForStages,
        commercialSensitivity,
        intentKind,
        isCourtesy,
      })
    ) {
      pushBlocker("deal_stage", `Deal is in ${stage} — review before sending.`);
      return { outcome: "draft", risk, reasons, blockers };
    }

    if (input.executionPath === "complex") {
      pushBlocker("high_stakes", "High-stakes message — draft for your review.");
      return { outcome: "draft", risk: "high", reasons, blockers };
    }

    if (input.classification.confidence < rules.minClassifyConfidence) {
      pushBlocker("low_confidence", "AI isn't confident enough to send automatically.");
      return { outcome: "draft", risk, reasons, blockers };
    }

    if (input.knowledgeGap) {
      pushBlocker("knowledge_gap", "No matching pricing doc — draft or add to Business Knowledge.");
      return this.withAck(profile, blockers, {
        outcome: "draft",
        risk: "medium",
        reasons,
        blockers,
      });
    }

    const discountBlocked =
      profile.discountAuthority.mode === "none" &&
      (intentKind === "negotiation" || isDiscountNegotiationMessage(lastInbound));

    if (discountBlocked) {
      pushBlocker("discount_authority", "Discounts need owner approval — draft for review.");
      return { outcome: "draft", risk: "medium", reasons, blockers };
    }

    const topHit = input.knowledgeHits[0];
    const grounded =
      topHit && topHit.similarity >= rules.minGroundingSimilarity;
    const answerability = assessAnswerability({
      groundingConfidence: input.groundingConfidence ?? topHit?.similarity ?? 0,
      hasIndexedChunks: input.hasIndexedChunks !== false,
      topSimilarity: topHit?.similarity,
      knowledgeGap: input.knowledgeGap,
      knowledgeHitCount: input.knowledgeHits.length,
    });

    if (!isCourtesy && answerability.reason && !answerability.canAutoSendFaq) {
      if (!input.hasIndexedChunks) {
        // kb_not_indexed already handled above
      } else if (input.knowledgeGap || input.knowledgeHits.length === 0) {
        pushBlocker("low_answerability", answerability.reason);
        return { outcome: "draft", risk: "medium", reasons, blockers };
      } else if (answerability.score < rules.minGroundingSimilarity) {
        pushBlocker("weak_grounding", "Draft for your review.");
        return { outcome: "draft", risk, reasons, blockers };
      }
    }

    const isPricing = isPricingInbound(lastInbound) || intentKind === "pricing";

    if (isPricing) {
      if (grounded && rules.autoSendPricingWhenGrounded && answerability.canAutoSendPricing) {
        reasons.push(`Grounded in “${topHit!.title}” (${Math.round(topHit!.similarity * 100)}% match).`);
        return { outcome: "send", risk: "medium", reasons, blockers };
      }
      if (grounded && rules.autoSendPricingWhenGrounded && !answerability.canAutoSendPricing) {
        pushBlocker("low_answerability", "Pricing match is not strong enough to auto-send.");
      }
      pushBlocker("pricing_review", "Pricing reply — review before sending.");
      return { outcome: "draft", risk: "medium", reasons, blockers };
    }

    if (grounded && rules.autoSendFaqWhenGrounded && answerability.canAutoSendFaq) {
      reasons.push(`Answered from “${topHit!.title}” (${Math.round(topHit!.similarity * 100)}% match).`);
      return { outcome: "send", risk: "low", reasons, blockers };
    }

    if (input.knowledgeHits.length === 0) {
      pushBlocker("not_grounded", "No Business Knowledge match — draft for review.");
    } else {
      pushBlocker("weak_grounding", "Knowledge match too weak — draft for review.");
    }
    return { outcome: "draft", risk, reasons, blockers };
  }

  private withAck(
    profile: BusinessEmployeeProfile,
    blockers: string[],
    result: AutomationPolicyResult,
  ): AutomationPolicyResult {
    const acknowledgment = resolveProfileAcknowledgment(profile, blockers);
    return acknowledgment ? { ...result, acknowledgment } : result;
  }
}
