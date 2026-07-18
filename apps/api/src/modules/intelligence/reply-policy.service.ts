import { Injectable, Logger } from "@nestjs/common";
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

/** Hard block — only scan the customer's latest message, not pipeline stage or thread history. */
const HARD_BLOCK_INBOUND =
  /refund|complaint|angry|furious|legal|lawyer|cancel\s+order|fraud|chargeback|sue|police|speak\s+to\s+(a\s+)?(human|person|manager|agent)/i;

export interface ReplyPolicyInput {
  ctx: ConversationContext;
  classification: AiClassificationResult;
  knowledgeHits: KnowledgeHit[];
  knowledgeGap: boolean;
  workspaceAutonomy: ReplyAutonomyMode;
  withinReplyWindow: boolean;
  autoSendPlanOk: boolean;
  recentAutoSendCount: number;
}

@Injectable()
export class ReplyPolicyService {
  private readonly logger = new Logger(ReplyPolicyService.name);

  constructor(private readonly prisma: PrismaService) {}

  evaluate(input: ReplyPolicyInput): ReplyDecision {
    const reasons: string[] = [];
    const blockers: string[] = [];
    const evaluatedAt = new Date().toISOString();
    const lastInbound = input.ctx.lastInbound?.trim() ?? "";

    const pushBlocker = (code: string, reason: string) => {
      if (!blockers.includes(code)) blockers.push(code);
      reasons.push(reason);
    };

    if (!input.ctx.conversation.aiEnabled) {
      pushBlocker("human_mode", "Human reply mode — AI will not compose a reply.");
      return this.decision("skip", 1, "low", reasons, blockers, evaluatedAt, false);
    }

    if (input.workspaceAutonomy === "intel_only") {
      pushBlocker("workspace_intel_only", "Classify only — no replies composed.");
      return this.decision("skip", 1, "low", reasons, blockers, evaluatedAt, false);
    }

    if (input.ctx.lead.stage === "WON" || input.ctx.lead.stage === "LOST") {
      pushBlocker("terminal_stage", "Deal is closed — no automated reply.");
      return this.decision("skip", 1, "low", reasons, blockers, evaluatedAt, false);
    }

    if (!input.withinReplyWindow) {
      pushBlocker("reply_window_closed", "24-hour WhatsApp window closed — use a template.");
      return this.decision("skip", 0.9, "medium", reasons, blockers, evaluatedAt, false);
    }

    if (!lastInbound) {
      pushBlocker("no_inbound", "Waiting for the customer to message first.");
      return this.decision("skip", 1, "low", reasons, blockers, evaluatedAt, false);
    }

    const risk = this.assessRisk(input);
    const confidence = this.compositeConfidence(input, risk);

    if (input.knowledgeHits.length > 0) {
      const top = input.knowledgeHits[0];
      reasons.push(`Grounded in “${top.title}” (${Math.round(top.similarity * 100)}% match).`);
    } else if (input.knowledgeGap) {
      reasons.push(
        "No pricing docs matched — reply will ask clarifying questions (no invented prices).",
      );
    }

    if (input.workspaceAutonomy === "assist") {
      reasons.push("AI assist — review the draft and tap Send.");
      return this.decision("draft", confidence, risk, reasons, blockers, evaluatedAt, false);
    }

    // auto_guarded: send on WhatsApp by default. Quality is enforced in the composer prompt.
    const hardBlock = this.autoSendHardBlock(input, lastInbound);
    if (hardBlock) {
      pushBlocker(hardBlock.code, hardBlock.reason);
      return this.decision("draft", confidence, risk, reasons, blockers, evaluatedAt, false);
    }

    reasons.push(
      "Guarded auto-reply — AI will send this on WhatsApp from your business number.",
    );
    if (input.knowledgeHits.length > 0) {
      reasons.push(`Source: “${input.knowledgeHits[0].title}”.`);
    }
    reasons.push("Your team can take over anytime in Conversations.");

    return this.decision("send", confidence, risk, reasons, blockers, evaluatedAt, true);
  }

  private autoSendHardBlock(
    input: ReplyPolicyInput,
    lastInbound: string,
  ): { code: string; reason: string } | null {
    if (!input.autoSendPlanOk) {
      return {
        code: "auto_send_plan",
        reason: "Auto-reply on WhatsApp needs Growth plan or higher.",
      };
    }
    if (input.recentAutoSendCount >= 5) {
      return {
        code: "auto_send_rate_limit",
        reason: "Auto-reply limit for this thread (5 per 24h) — draft only.",
      };
    }
    if (input.classification.requiresHuman) {
      return {
        code: "auto_send_handoff",
        reason: "Customer needs a human — AI drafted a starting point for you.",
      };
    }
    if (HARD_BLOCK_INBOUND.test(lastInbound)) {
      return {
        code: "auto_send_sensitive",
        reason: "Sensitive message (complaint/refund/legal) — human should reply.",
      };
    }
    return null;
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
        metadata: { ...meta, replyDecision: decision } as object,
      },
    });

    this.logger.log(
      `Reply policy ${conversationId}: mode=${decision.mode} risk=${decision.risk} confidence=${decision.confidence}`,
    );
  }

  private assessRisk(input: ReplyPolicyInput): ReplyRiskLevel {
    const lastInbound = input.ctx.lastInbound ?? "";
    if (HARD_BLOCK_INBOUND.test(lastInbound)) return "high";
    if (input.classification.requiresHuman) return "high";
    if (input.knowledgeGap) return "medium";
    if (input.knowledgeHits.length === 0) return "medium";
    return "low";
  }

  private compositeConfidence(input: ReplyPolicyInput, risk: ReplyRiskLevel): number {
    let score = input.classification.confidence;
    if (input.knowledgeHits.length > 0) {
      score = Math.min(1, score * 0.6 + input.knowledgeHits[0].similarity * 0.4);
    }
    if (risk === "high") score *= 0.75;
    if (risk === "medium") score *= 0.92;
    return Math.round(score * 100) / 100;
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
