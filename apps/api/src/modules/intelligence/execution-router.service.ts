import { Injectable } from "@nestjs/common";
import type { AiClassificationResult, ReplyRiskLevel } from "@growvisi/shared";
import { isSimpleGreeting, isSimpleThanks } from "@growvisi/shared";
import type { ConversationContext } from "./context-builder.service";
import { FastReplyService } from "./fast-reply.service";
import { resolveReplyIntentKind } from "./reply-intent";

export type ExecutionPath = "fast" | "standard" | "complex" | "human";

export interface ExecutionRoute {
  path: ExecutionPath;
  intentKind: string;
  reason: string;
  confidence: number;
  risk: ReplyRiskLevel;
}

const SENSITIVE_INBOUND =
  /refund|complaint|angry|furious|legal|lawyer|cancel\s+order|fraud|chargeback|sue|police|speak\s+to\s+(a\s+)?(human|person|manager|agent)/i;

const PRICING_MSG =
  /pric|cost|fee|rate|package|plan|₹|rs\.?\s*\d|discount|quote|emi|payment|how much/i;

@Injectable()
export class ExecutionRouterService {
  constructor(private readonly fastReply: FastReplyService) {}

  /** Route before full classify LLM — uses message heuristics + thread context. */
  routePreClassify(ctx: ConversationContext): ExecutionRoute {
    const msg = ctx.lastInbound?.trim() ?? "";

    if (!msg) {
      return this.route("human", "general", "No inbound message", 1, "low");
    }

    if (SENSITIVE_INBOUND.test(msg)) {
      return this.route("human", "complaint", "Sensitive inbound — human review", 0.95, "high");
    }

    if (this.fastReply.isFastPathMessage(msg)) {
      const kind = isSimpleGreeting(msg)
        ? "greeting"
        : isSimpleThanks(msg)
          ? "thanks"
          : "ack";
      return this.route("fast", kind, "Simple greeting, thanks, or ack", 0.95, "low");
    }

    if (PRICING_MSG.test(msg)) {
      return this.route("standard", "pricing", "Pricing inquiry", 0.75, "medium");
    }

    const intentKind = resolveReplyIntentKind(msg, null);
    if (intentKind === "complaint" || intentKind === "negotiation") {
      return this.route("complex", intentKind, "High-stakes conversation", 0.7, "high");
    }

    if (intentKind === "ready_to_buy") {
      return this.route("standard", intentKind, "Purchase intent", 0.8, "medium");
    }

    return this.route("standard", intentKind, "General inquiry", 0.65, "medium");
  }

  /** Refine route after classify LLM — may upgrade to human/complex. */
  refineAfterClassify(
    pre: ExecutionRoute,
    result: AiClassificationResult,
    ctx: ConversationContext,
  ): ExecutionRoute {
    if (result.requiresHuman) {
      return this.route("human", pre.intentKind, "Classification requires human", result.confidence, "high");
    }

    if (SENSITIVE_INBOUND.test(ctx.lastInbound ?? "")) {
      return this.route("human", "complaint", "Sensitive inbound", 0.95, "high");
    }

    if (pre.path === "fast") return pre;

    const intentKind = resolveReplyIntentKind(ctx.lastInbound, result);

    if (intentKind === "complaint" || intentKind === "negotiation") {
      return this.route("complex", intentKind, "Negotiation or complaint", result.confidence, "high");
    }

    if (result.confidence < 0.45) {
      return this.route("complex", intentKind, "Low classification confidence", result.confidence, "high");
    }

    if (intentKind === "pricing" && result.confidence >= 0.6) {
      return this.route("standard", intentKind, "Grounded pricing path", result.confidence, "medium");
    }

    return { ...pre, intentKind, confidence: result.confidence };
  }

  private route(
    path: ExecutionPath,
    intentKind: string,
    reason: string,
    confidence: number,
    risk: ReplyRiskLevel,
  ): ExecutionRoute {
    return { path, intentKind, reason, confidence, risk };
  }
}
