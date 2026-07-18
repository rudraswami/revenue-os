import { Injectable } from "@nestjs/common";
import type {
  AiClassificationResult,
  KnowledgeHit,
  ReplyDecision,
  ReplyAutonomyMode,
  ReplyExecutionMode,
  ReplyRiskLevel,
} from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { ConversationContext } from "./context-builder.service";

const HIGH_RISK_INTENT =
  /negotiat|discount|refund|complaint|angry|legal|lawyer|cancel|fraud|chargeback|sue|police/i;
const PRICING_TOPIC =
  /pric|cost|fee|rate|package|₹|rs\.?\s*\d|discount|quote|emi|payment/i;

export interface ReplyPolicyInput {
  ctx: ConversationContext;
  classification: AiClassificationResult;
  knowledgeHits: KnowledgeHit[];
  knowledgeGap: boolean;
  workspaceAutonomy: ReplyAutonomyMode;
  withinReplyWindow: boolean;
  /** Growth+ plan allows guarded auto-send */
  autoSendPlanOk: boolean;
  /** Outbound messages with sentByAi in the last 24h on this thread */
  recentAutoSendCount: number;
}

@Injectable()
export class ReplyPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  evaluate(input: ReplyPolicyInput): ReplyDecision {
    const reasons: string[] = [];
    const blockers: string[] = [];
    const evaluatedAt = new Date().toISOString();

    const pushBlocker = (code: string, reason: string) => {
      blockers.push(code);
      reasons.push(reason);
    };

    if (!input.ctx.conversation.aiEnabled) {
      pushBlocker("human_mode", "Human reply mode — AI will not compose a reply.");
      return this.decision("skip", 1, "low", reasons, blockers, evaluatedAt, false);
    }

    if (input.workspaceAutonomy === "intel_only") {
      pushBlocker(
        "workspace_intel_only",
        "Workspace is set to classify only — enable AI assist in Conversations to get drafts.",
      );
      return this.decision("skip", 1, "low", reasons, blockers, evaluatedAt, false);
    }

    if (input.ctx.lead.stage === "WON" || input.ctx.lead.stage === "LOST") {
      pushBlocker("terminal_stage", "Deal is closed — no automated reply suggested.");
      return this.decision("skip", 1, "low", reasons, blockers, evaluatedAt, false);
    }

    if (!input.withinReplyWindow) {
      pushBlocker(
        "reply_window_closed",
        "24-hour WhatsApp window closed — use a template from New message.",
      );
      return this.decision("skip", 0.9, "medium", reasons, blockers, evaluatedAt, false);
    }

    if (!input.ctx.lastInbound?.trim()) {
      pushBlocker("no_inbound", "Waiting for the customer to message first.");
      return this.decision("skip", 1, "low", reasons, blockers, evaluatedAt, false);
    }

    const risk = this.assessRisk(input);
    const confidence = this.compositeConfidence(input, risk);

    if (input.classification.requiresHuman) {
      reasons.push("Flagged for you — AI will draft a starting point for your review.");
    }

    if (input.knowledgeGap) {
      reasons.push(
        "Pricing or policy question without matching docs — draft asks clarifying questions only.",
      );
    }

    if (input.knowledgeHits.length > 0) {
      const top = input.knowledgeHits[0];
      reasons.push(`Grounded in “${top.title}” (${Math.round(top.similarity * 100)}% match).`);
    } else if (!input.knowledgeGap) {
      reasons.push("No business knowledge matched — draft stays general and cautious.");
    }

    const autoEligible = this.isAutoSendEligible(input, risk, confidence);

    const canAutoSend =
      input.workspaceAutonomy === "auto_guarded" &&
      autoEligible &&
      input.autoSendPlanOk &&
      input.recentAutoSendCount < 3;

    if (canAutoSend) {
      reasons.push(
        "Guarded auto-reply — grounded FAQ answer will be sent on WhatsApp from your business number.",
      );
      if (input.knowledgeHits.length > 0) {
        reasons.push(`Source: “${input.knowledgeHits[0].title}”.`);
      }
      reasons.push("Your team can review and continue the thread in Conversations.");
      return this.decision("send", confidence, risk, reasons, blockers, evaluatedAt, true);
    }

    if (input.workspaceAutonomy === "auto_guarded" && autoEligible && !input.autoSendPlanOk) {
      reasons.push(
        "Guarded auto-reply needs Growth plan — drafting for you to send instead.",
      );
    } else if (
      input.workspaceAutonomy === "auto_guarded" &&
      autoEligible &&
      input.recentAutoSendCount >= 3
    ) {
      reasons.push("Auto-reply limit reached for this thread (3 per 24h) — draft only.");
    }

    if (input.workspaceAutonomy === "assist") {
      reasons.push("Review and send — AI assist never auto-sends to WhatsApp.");
    }

    return this.decision("draft", confidence, risk, reasons, blockers, evaluatedAt, autoEligible);
  }

  async persistDecision(
    organizationId: string,
    conversationId: string,
    decision: ReplyDecision,
  ): Promise<void> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      select: { metadata: true },
    });
    if (!conversation) return;

    const meta =
      conversation.metadata && typeof conversation.metadata === "object"
        ? (conversation.metadata as Record<string, unknown>)
        : {};

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        metadata: {
          ...meta,
          replyDecision: decision,
        } as object,
      },
    });
  }

  private assessRisk(input: ReplyPolicyInput): ReplyRiskLevel {
    const topic = `${input.ctx.lastInbound ?? ""} ${input.classification.intent ?? ""}`;
    if (input.knowledgeGap && PRICING_TOPIC.test(topic)) return "high";
    if (input.classification.requiresHuman) return "high";
    if (HIGH_RISK_INTENT.test(topic)) return "high";
    if (input.classification.confidence < 0.65) return "medium";
    if (input.knowledgeHits.length === 0) return "medium";
    return "low";
  }

  private compositeConfidence(input: ReplyPolicyInput, risk: ReplyRiskLevel): number {
    let score = input.classification.confidence;
    if (input.knowledgeHits.length > 0) {
      score = Math.min(1, score * 0.6 + input.knowledgeHits[0].similarity * 0.4);
    }
    if (risk === "high") score *= 0.75;
    if (risk === "medium") score *= 0.9;
    return Math.round(score * 100) / 100;
  }

  private isAutoSendEligible(
    input: ReplyPolicyInput,
    risk: ReplyRiskLevel,
    confidence: number,
  ): boolean {
    if (risk !== "low") return false;
    if (input.classification.requiresHuman) return false;
    if (input.knowledgeGap) return false;
    if (confidence < 0.85) return false;
    if (input.knowledgeHits.length === 0) return false;
    if (input.knowledgeHits[0].similarity < 0.78) return false;
    if (HIGH_RISK_INTENT.test(input.ctx.lastInbound ?? "")) return false;
    return true;
  }

  private decision(
    mode: ReplyExecutionMode,
    confidence: number,
    risk: ReplyRiskLevel,
    reasons: string[],
    blockers: string[],
    evaluatedAt: string,
    autoEligible: boolean,
  ): ReplyDecision {
    return {
      mode,
      confidence,
      risk,
      reasons,
      blockers: blockers.length ? blockers : undefined,
      evaluatedAt,
      autoEligible,
    };
  }
}
