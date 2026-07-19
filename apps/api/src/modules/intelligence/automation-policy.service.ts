import { Injectable } from "@nestjs/common";
import type {
  AiClassificationResult,
  AutomationPolicyRules,
  ExecutionPath,
  IntelligenceWorkspaceSettings,
  KnowledgeHit,
  ReplyRiskLevel,
} from "@growvisi/shared";
import {
  AUTOMATION_PRESET_DEFAULTS,
  isSimpleAck,
  isSimpleGreeting,
  isSimpleThanks,
} from "@growvisi/shared";
import type { ConversationContext } from "./context-builder.service";
import { resolveReplyIntentKind } from "./reply-intent";

const SENSITIVE_INBOUND =
  /refund|complaint|angry|furious|legal|lawyer|cancel\s+order|fraud|chargeback|sue|police|speak\s+to\s+(a\s+)?(human|person|manager|agent)/i;

const PRICING_MSG =
  /pric|cost|fee|rate|package|plan|₹|rs\.?\s*\d|discount|quote|emi|payment|how much/i;

export type AutomationOutcome = "send" | "draft" | "human";

export interface AutomationPolicyInput {
  settings: IntelligenceWorkspaceSettings;
  ctx: ConversationContext;
  classification: AiClassificationResult;
  knowledgeHits: KnowledgeHit[];
  knowledgeGap: boolean;
  executionPath: ExecutionPath;
  humanHandling: boolean;
}

export interface AutomationPolicyResult {
  outcome: AutomationOutcome;
  risk: ReplyRiskLevel;
  reasons: string[];
  blockers: string[];
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

    const lastInbound = input.ctx.lastInbound?.trim() ?? "";
    const risk = this.assessRisk(input, lastInbound);

    if (input.humanHandling) {
      pushBlocker("human_handling", "You're handling this thread — Growvisi won't message the customer.");
      return { outcome: "human", risk, reasons, blockers };
    }

    if (input.executionPath === "human" || input.classification.requiresHuman) {
      pushBlocker("needs_human", "Customer needs a person — your team should reply.");
      return { outcome: "human", risk: "high", reasons, blockers };
    }

    if (SENSITIVE_INBOUND.test(lastInbound)) {
      pushBlocker("sensitive_topic", "Sensitive topic — human should reply.");
      return { outcome: "human", risk: "high", reasons, blockers };
    }

    const rules = this.resolveRules(input.settings);
    const stage = input.ctx.lead.stage;

    if (rules.humanForStages.includes(stage)) {
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
      return { outcome: "draft", risk: "medium", reasons, blockers };
    }

    const topHit = input.knowledgeHits[0];
    const grounded =
      topHit && topHit.similarity >= rules.minGroundingSimilarity;
    const isGreeting =
      input.executionPath === "fast" ||
      isSimpleGreeting(lastInbound) ||
      isSimpleThanks(lastInbound) ||
      isSimpleAck(lastInbound);
    const isPricing = PRICING_MSG.test(lastInbound) || resolveReplyIntentKind(lastInbound, input.classification) === "pricing";

    if (isGreeting && rules.autoSendGreetings) {
      reasons.push("Simple courtesy reply — safe to send.");
      return { outcome: "send", risk: "low", reasons, blockers };
    }

    if (isPricing) {
      if (grounded && rules.autoSendPricingWhenGrounded) {
        reasons.push(`Grounded in “${topHit!.title}” (${Math.round(topHit!.similarity * 100)}% match).`);
        return { outcome: "send", risk: "medium", reasons, blockers };
      }
      pushBlocker("pricing_review", "Pricing reply — review before sending.");
      return { outcome: "draft", risk: "medium", reasons, blockers };
    }

    if (grounded && rules.autoSendFaqWhenGrounded) {
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

  private assessRisk(input: AutomationPolicyInput, lastInbound: string): ReplyRiskLevel {
    if (SENSITIVE_INBOUND.test(lastInbound)) return "high";
    if (input.classification.requiresHuman) return "high";
    if (input.knowledgeGap) return "medium";
    if (input.knowledgeHits.length === 0) return "medium";
    return "low";
  }
}
