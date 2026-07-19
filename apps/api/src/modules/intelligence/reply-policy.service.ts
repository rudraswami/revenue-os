import { Injectable, Logger } from "@nestjs/common";
import type {
  AiClassificationResult,
  ExecutionPath,
  IntelligenceWorkspaceSettings,
  KnowledgeHit,
  ReplyDecision,
  ReplyAutonomyMode,
  ReplyExecutionMode,
  ReplyRiskLevel,
} from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { ConversationContext } from "./context-builder.service";
import { AutomationPolicyService } from "./automation-policy.service";

export interface ReplyPolicyInput {
  ctx: ConversationContext;
  classification: AiClassificationResult;
  knowledgeHits: KnowledgeHit[];
  knowledgeGap: boolean;
  workspaceAutonomy: ReplyAutonomyMode;
  intelligenceSettings: IntelligenceWorkspaceSettings;
  withinReplyWindow: boolean;
  autoSendPlanOk: boolean;
  executionPath: ExecutionPath;
  /** Set when safety rails block auto-send (velocity / loop protection). */
  safetyBlocked?: { code: string; reason: string };
}

@Injectable()
export class ReplyPolicyService {
  private readonly logger = new Logger(ReplyPolicyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly automationPolicy: AutomationPolicyService,
  ) {}

  evaluate(input: ReplyPolicyInput): ReplyDecision {
    const reasons: string[] = [];
    const blockers: string[] = [];
    const evaluatedAt = new Date().toISOString();
    const lastInbound = input.ctx.lastInbound?.trim() ?? "";

    const pushBlocker = (code: string, reason: string) => {
      if (!blockers.includes(code)) blockers.push(code);
      reasons.push(reason);
    };

    const humanHandling = !input.ctx.conversation.aiEnabled;

    if (humanHandling) {
      pushBlocker("human_handling", "You're handling this thread.");
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
      reasons.push("Suggest only — your team sends from Conversations.");
      return this.decision("draft", confidence, risk, reasons, blockers, evaluatedAt, false);
    }

    // auto_guarded
    if (!input.autoSendPlanOk) {
      pushBlocker("auto_send_plan", "Auto-reply on WhatsApp needs Growth plan or higher.");
      return this.decision("draft", confidence, risk, reasons, blockers, evaluatedAt, false);
    }

    if (input.safetyBlocked) {
      pushBlocker(input.safetyBlocked.code, input.safetyBlocked.reason);
      return this.decision("draft", confidence, risk, reasons, blockers, evaluatedAt, false);
    }

    const policy = this.automationPolicy.evaluate({
      settings: input.intelligenceSettings,
      ctx: input.ctx,
      classification: input.classification,
      knowledgeHits: input.knowledgeHits,
      knowledgeGap: input.knowledgeGap,
      executionPath: input.executionPath,
      humanHandling,
    });

    reasons.push(...policy.reasons);
    for (const code of policy.blockers) {
      if (!blockers.includes(code)) blockers.push(code);
    }

    if (policy.outcome === "send") {
      reasons.push("Growvisi will send this on WhatsApp from your business number.");
      reasons.push("Your team can take over anytime in Conversations.");
      return this.decision("send", confidence, policy.risk, reasons, blockers, evaluatedAt, true);
    }

    if (policy.outcome === "human") {
      return this.decision("draft", confidence, policy.risk, reasons, blockers, evaluatedAt, false);
    }

    return this.decision("draft", confidence, policy.risk, reasons, blockers, evaluatedAt, false);
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
    const SENSITIVE =
      /refund|complaint|angry|furious|legal|lawyer|cancel\s+order|fraud|chargeback|sue|police|speak\s+to\s+(a\s+)?(human|person|manager|agent)/i;
    if (SENSITIVE.test(lastInbound)) return "high";
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
