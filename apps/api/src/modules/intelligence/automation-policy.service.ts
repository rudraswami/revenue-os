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
  /** Total active KB documents for the org — used for adaptive confidence thresholds. */
  totalKbDocs?: number;
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
    const topSimilarity = topHit?.similarity ?? 0;
    const answerability = assessAnswerability({
      groundingConfidence: input.groundingConfidence ?? topSimilarity,
      hasIndexedChunks: input.hasIndexedChunks !== false,
      topSimilarity: topHit?.similarity,
      knowledgeGap: input.knowledgeGap,
      knowledgeHitCount: input.knowledgeHits.length,
    });

    const isPricing = isPricingInbound(lastInbound) || intentKind === "pricing";

    // ── Pricing stays strict: never auto-send weak or ungrounded pricing. ──
    if (isPricing) {
      const grounded = Boolean(topHit) && topSimilarity >= rules.minGroundingSimilarity;
      if (grounded && rules.autoSendPricingWhenGrounded && answerability.canAutoSendPricing) {
        reasons.push(
          `Grounded in “${topHit!.title}” (${Math.round(topSimilarity * 100)}% match).`,
        );
        return { outcome: "send", risk: "medium", reasons, blockers };
      }
      pushBlocker("pricing_review", "Pricing reply — review before sending.");
      return { outcome: "draft", risk: "medium", reasons, blockers };
    }

    // ── Answer-first for FAQ / general / product questions. ──
    // The pre-compose gate only checks whether *relevant knowledge plausibly
    // exists*. The post-compose coverage gate (needsHuman, selfConfidence) is
    // the real arbiter of whether the reply is safe — so we do NOT double-block
    // here on strict raw similarity. Retrieval already filters weak matches, so
    // any surviving hit above the relevance floor is worth answering from.
    const RELEVANCE_FLOOR = 0.32;
    if (
      rules.autoSendFaqWhenGrounded &&
      input.knowledgeHits.length > 0 &&
      topSimilarity >= RELEVANCE_FLOOR &&
      !this.isSensitiveIntent(intentKind)
    ) {
      reasons.push(
        `Relevant knowledge found (“${topHit!.title}”, ${Math.round(topSimilarity * 100)}% match) — composing an answer with a post-send safety check.`,
      );
      return { outcome: "send", risk: "low", reasons, blockers };
    }

    // ── No usable knowledge → send a branded, helpful holding message. ──
    // Answer-first means the customer should never get silence: we auto-send a
    // warm generic reply (and still create a draft for the team to follow up).
    if (input.knowledgeHits.length === 0) {
      pushBlocker("no_knowledge", "No matching Business Knowledge — sending a helpful holding reply.");
    } else {
      pushBlocker("weak_grounding", "Knowledge match too weak — sending a helpful holding reply.");
    }
    return {
      outcome: "draft",
      risk,
      reasons,
      blockers,
      acknowledgment: this.genericHoldingMessage(profile),
    };
  }

  /** Warm, generic customer-facing reply when we have no knowledge to ground on. */
  private genericHoldingMessage(profile: BusinessEmployeeProfile): string {
    const configured =
      profile.acknowledgments["no_match"] ?? profile.acknowledgments["general"];
    if (configured?.trim()) return configured.trim();
    return "Thanks for reaching out! I'd love to help you with this. Could you share a little more about what you're looking for? I'll get you the details right away.";
  }

  private isSensitiveIntent(intentKind: string): boolean {
    return ["complaint", "negotiation"].includes(intentKind);
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
