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
  hasHardHumanSignal,
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

    // ── 1. Human handling (user took over) ──
    if (input.humanHandling) {
      pushBlocker("human_handling", "You're handling this thread — Growvisi won't message the customer.");
      return { outcome: "human", risk, reasons, blockers };
    }

    // ── 2. Hard human signals only ──
    const hardHumanSignal = hasHardHumanSignal(lastInbound, input.classification);

    if (input.executionPath === "human" && hardHumanSignal) {
      pushBlocker("needs_human", "Customer needs a person — your team should reply.");
      return this.withAck(profile, blockers, {
        outcome: "human",
        risk: "high",
        reasons,
        blockers,
      });
    }

    // Advisory requiresHuman is informational — knowledge decides.
    if (input.classification.requiresHuman && !hardHumanSignal) {
      reasons.push("AI suggested human review — knowledge will decide.");
    } else if (input.classification.requiresHuman && hardHumanSignal) {
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

    // ── 3. Courtesy fast path ──
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

    if (isCourtesy && rules.autoSendGreetings) {
      reasons.push("Simple courtesy reply — safe to send.");
      return { outcome: "send", risk: "low", reasons, blockers };
    }

    // ── 4. KB not indexed yet ──
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

    // ── 5. Post-sale / win-back commercial messages need human review. ──
    if (
      relationshipPhase === "post_sale" &&
      commercialSensitivity === "high"
    ) {
      pushBlocker("post_sale_commercial", "Deal is closed — commercial replies need your review.");
      return { outcome: "draft", risk: "medium", reasons, blockers };
    }

    if (
      relationshipPhase === "win_back" &&
      commercialSensitivity !== "low"
    ) {
      pushBlocker("win_back_commercial", "Win-back opportunity — review before sending commercial details.");
      return { outcome: "draft", risk: "medium", reasons, blockers };
    }

    // ── 5. Deal stage gate — skip when listing standard prices from grounded KB. ──
    const groundedCatalogReply =
      input.knowledgeHits.length > 0 &&
      (intentKind === "pricing" || intentKind === "product_info");

    if (
      !groundedCatalogReply &&
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

    // ── 6. Discount requests need owner approval (message must ask for a discount). ──
    const discountBlocked =
      profile.discountAuthority.mode === "none" && isDiscountNegotiationMessage(lastInbound);
    if (discountBlocked) {
      pushBlocker("discount_authority", "Discounts need owner approval — draft for review.");
      return { outcome: "draft", risk: "medium", reasons, blockers };
    }

    // ── 7. ANSWER-FIRST: any question with knowledge → send. ──
    //
    // As a founder: every draft is a customer left waiting. Pricing is NOT an
    // exception — "what's the price?" is a hot lead, and drafting it loses the
    // sale. We answer pricing, products, availability, hours — everything — the
    // moment we have grounding. There is NO keyword gate here: intent is used
    // only to route sensitive topics, never to block ordinary sales questions.
    //
    // Factual safety lives entirely POST-compose:
    //   • the trust rail drafts a reply only if it states a price/number that
    //     isn't grounded in a retrieved source (prevents invented prices),
    //   • the coverage gate drafts if the model couldn't actually answer.
    // Both inspect the GENERATED text, not the inbound keyword.
    const topHit = input.knowledgeHits[0];
    const topSimilarity = topHit?.similarity ?? 0;

    if (input.knowledgeHits.length > 0 && !this.isSensitiveIntent(intentKind)) {
      reasons.push(
        `Knowledge found ("${topHit!.title}", ${Math.round(topSimilarity * 100)}% match) — answering.`,
      );
      return { outcome: "send", risk: intentKind === "pricing" ? "medium" : "low", reasons, blockers };
    }

    // ── 8. Sensitive intents (complaint, discount negotiation) → draft. ──
    // These need human judgment even when knowledge exists. The AI still
    // composes a suggestion; the team decides whether to send it.
    if (this.isSensitiveIntent(intentKind) && input.knowledgeHits.length > 0) {
      pushBlocker("sensitive_intent", "Complaint/negotiation — draft with AI suggestion for your review.");
      return { outcome: "draft", risk: "medium", reasons, blockers };
    }

    // ── 9. No knowledge → draft only (no auto holding message). ──
    if (input.knowledgeHits.length === 0) {
      pushBlocker("no_knowledge", "No matching Business Knowledge — draft for your review.");
    } else {
      pushBlocker("weak_grounding", "Knowledge match too weak — draft for your review.");
    }
    return {
      outcome: "draft",
      risk,
      reasons,
      blockers,
    };
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
