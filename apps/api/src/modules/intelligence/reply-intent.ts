import type { AiClassificationResult, LeadStage, ReplyRiskLevel } from "@growvisi/shared";
import { buildJudgmentRagQuery, isSimpleGreeting } from "@growvisi/shared";

export type ReplyIntentKind =
  | "greeting"
  | "thanks"
  | "test_checkin"
  | "pricing"
  | "negotiation"
  | "ready_to_buy"
  | "follow_up"
  | "complaint"
  | "availability_check"
  | "hours_location"
  | "booking_request"
  | "payment_method"
  | "product_info"
  | "general";

/** Shared across policy, routing, and knowledge-gap detection. */
export const SENSITIVE_INBOUND_PATTERN =
  /refund|complaint|angry|furious|legal|lawyer|cancel\s+order|fraud|chargeback|sue|police|speak\s+to\s+(a\s+)?(human|person|manager|agent)/i;

export const PRICING_INBOUND_PATTERN =
  /pric|cost|fee|rate|package|plan|₹|rs\.?\s*\d|discount|quote|emi|payment|how much/i;

const TEST_MSG = /^(test(ing)?|hello\s*test|hi\s*test)[\s!.?]*$/i;
const THANKS_MSG = /^(thanks?|thank\s*you|thx|dhanyavaad|shukriya)[\s!.?]*$/i;
const BUY_MSG = /ready to (buy|order|purchase)|let'?s (proceed|go ahead)|book\s*now|place\s*order/i;

const AVAILABILITY_MSG = /availab|stock|in stock|milega\s*kya|mil jayega|do you have|kya hai|product hai/i;
const HOURS_LOCATION_MSG = /where|location|address|timing|hours|open|close|kahan|pata|map|direction|shop|store|office|visit/i;
const BOOKING_MSG = /book|appoint|slot|schedul|reserv|tomorrow|kal|parso|time slot/i;
const PAYMENT_METHOD_MSG = /upi|gpay|paytm|phonepe|card|cash|cod|cash on delivery|net bank|neft|imps|payment.*method|how.*pay|kaise.*pay/i;
const PRODUCT_INFO_MSG = /what.*offer|service|product|feature|detail|specification|menu|catalog|batao|kya kya|tell me about|show me|which/i;

export function isSensitiveInbound(text: string | null | undefined): boolean {
  return SENSITIVE_INBOUND_PATTERN.test((text ?? "").trim());
}

export function isPricingInbound(text: string | null | undefined): boolean {
  return PRICING_INBOUND_PATTERN.test((text ?? "").trim());
}

export interface AssessReplyRiskInput {
  lastInbound?: string | null;
  requiresHuman?: boolean;
  knowledgeGap?: boolean;
  knowledgeHitCount?: number;
}

/** Shared reply risk heuristic for policy + automation layers. */
export function assessReplyRisk(input: AssessReplyRiskInput): ReplyRiskLevel {
  if (isSensitiveInbound(input.lastInbound)) return "high";
  if (input.requiresHuman) return "high";
  if (input.knowledgeGap) return "medium";
  if ((input.knowledgeHitCount ?? 0) === 0) return "medium";
  return "low";
}

/** Resolve how to reply from the latest customer message + AI classification. */
export function resolveReplyIntentKind(
  lastInbound: string | null | undefined,
  classification?: Pick<
    AiClassificationResult,
    "intent" | "stage" | "sentiment" | "nextAction" | "summary"
  > | null,
): ReplyIntentKind {
  const msg = (lastInbound ?? "").trim();
  const intentText = `${classification?.intent ?? ""} ${classification?.summary ?? ""}`;

  if (!msg) return "general";
  if (THANKS_MSG.test(msg)) return "thanks";
  if (TEST_MSG.test(msg)) return "test_checkin";
  if (isSimpleGreeting(msg)) return "greeting";
  if (BUY_MSG.test(msg) || /ready to buy|purchase/i.test(intentText)) return "ready_to_buy";
  if (/complaint|angry|refund|disappoint/i.test(msg) || /complaint/i.test(intentText)) {
    return "complaint";
  }

  const stage = classification?.stage as LeadStage | undefined;
  if (
    stage === "NEGOTIATION" ||
    /negotiat|discount|counter/i.test(intentText) ||
    (/negotiat|discount/i.test(msg) && isPricingInbound(msg))
  ) {
    return "negotiation";
  }

  if (PAYMENT_METHOD_MSG.test(msg) || /payment method/i.test(intentText)) return "payment_method";

  if (isPricingInbound(msg) || /pricing|price inquiry|cost/i.test(intentText)) {
    return "pricing";
  }

  if (/follow.?up|checking in|any update|status/i.test(msg) || /follow up/i.test(intentText)) {
    return "follow_up";
  }

  if (BOOKING_MSG.test(msg) || /booking/i.test(intentText)) return "booking_request";
  if (AVAILABILITY_MSG.test(msg) || /availab/i.test(intentText)) return "availability_check";
  if (HOURS_LOCATION_MSG.test(msg) || /location/i.test(intentText)) return "hours_location";
  if (PRODUCT_INFO_MSG.test(msg) || /product/i.test(intentText)) return "product_info";

  return "general";
}

/** Intent-specific instructions for the reply composer (sales rep playbook). */
export function playbookForRelationshipPhase(
  phase: "pre_sale" | "active_deal" | "post_sale" | "win_back",
): string {
  switch (phase) {
    case "post_sale":
      return [
        "Relationship: Post-sale customer.",
        "Be supportive and helpful. Focus on delivery, scheduling, and service — do not pitch or upsell unless they ask.",
      ].join(" ");
    case "win_back":
      return [
        "Relationship: Win-back opportunity.",
        "Be warm and professional. Acknowledge their return. Do not pressure — invite conversation.",
      ].join(" ");
    case "active_deal":
      return "Relationship: Active deal — be clear, responsive, and move toward next step.";
    default:
      return "Relationship: Pre-sale — welcome, qualify needs, build trust.";
  }
}

/** Intent-specific instructions for the reply composer (sales rep playbook). */
export function playbookForIntent(kind: ReplyIntentKind): string {
  switch (kind) {
    case "greeting":
      return [
        "Playbook: Greeting",
        "Warm welcome. Mirror their energy. One open question about what they need.",
        "Do not mention pricing unless they asked in this message.",
      ].join(" ");
    case "thanks":
      return [
        "Playbook: Thanks",
        "Acknowledge graciously. Offer one helpful next step or ask if anything else is needed.",
      ].join(" ");
    case "test_checkin":
      return [
        "Playbook: Test / check-in",
        "Confirm you received their message. Sound human and available. Invite them to share what they need.",
      ].join(" ");
    case "pricing":
      return [
        "Playbook: Pricing inquiry",
        "Answer from business knowledge only. If docs are missing, ask 1–2 clarifying questions (scope, team size, timeline).",
        "Never quote numbers not in the knowledge section.",
      ].join(" ");
    case "negotiation":
      return [
        "Playbook: Negotiation / objection",
        "Acknowledge their concern first. Understand budget, timeline, and what matters most.",
        "Reframe value using business knowledge — do not invent discounts.",
        "If they push on price without policy docs, offer a quick call or human follow-up.",
      ].join(" ");
    case "ready_to_buy":
      return [
        "Playbook: Ready to buy",
        "Positive momentum. Confirm what they want, next step to close (payment, onboarding, call).",
      ].join(" ");
    case "follow_up":
      return [
        "Playbook: Follow-up",
        "Reference the thread context. Give a clear status or next step. Sound proactive, not robotic.",
      ].join(" ");
    case "complaint":
      return [
        "Playbook: Complaint",
        "Empathy first. Apologize without admitting fault. Offer to have a teammate follow up quickly.",
      ].join(" ");
    case "availability_check":
      return [
        "Playbook: Availability check",
        "Check business knowledge for product/service availability. If not in knowledge, ask one clarifying question about what they need.",
        "Never confirm availability unless it's in the knowledge base.",
      ].join(" ");
    case "hours_location":
      return [
        "Playbook: Hours & location",
        "Share business hours, address, or directions from knowledge. Keep it short and actionable.",
        "Include Google Maps link if available in knowledge.",
      ].join(" ");
    case "booking_request":
      return [
        "Playbook: Booking request",
        "Confirm what they want to book and when. If booking URL exists in close actions, share it.",
        "If no booking system, offer to schedule manually and confirm timing.",
      ].join(" ");
    case "payment_method":
      return [
        "Playbook: Payment method",
        "List accepted payment methods from knowledge. If payment link exists in close actions, share it.",
        "Keep it factual — never invent payment options not in business knowledge.",
      ].join(" ");
    case "product_info":
      return [
        "Playbook: Product information",
        "Share relevant product/service details from knowledge. Be specific and helpful.",
        "If catalog is available, point them to it. Ask what specific product they're interested in if the question is broad.",
      ].join(" ");
    default:
      return [
        "Playbook: General inquiry",
        "Read the latest message carefully. Answer every distinct question or request.",
        "Qualify gently (what they need, timeline, location) when it helps close the deal.",
        "Sound like a helpful sales rep — specific, warm, never generic filler.",
      ].join(" ");
  }
}

export function buildRagQuery(
  lastInbound: string | null | undefined,
  classification?: Pick<
    AiClassificationResult,
    "intent" | "summary" | "replyBrief" | "entities" | "customerNeeds"
  > | null,
): string {
  const judgment = classification ? buildJudgmentRagQuery(classification) : "";
  const parts = [lastInbound, judgment || classification?.intent, classification?.summary]
    .filter((p) => typeof p === "string" && p.trim().length > 0)
    .map((p) => String(p).trim());
  return parts.join(" — ").slice(0, 500) || "customer inquiry";
}
