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
  /pric|prise|cost|fee|rate|package|plan|₹|rs\.?\s*\d|discount|quote|emi|payment|how much|kitna|rate card/i;

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

/**
 * Whether this turn has a HARD human signal — an explicit, verifiable reason a
 * person must reply (customer asked for a human, sensitive topic, owner-only,
 * trust recovery, or apology needed).
 *
 * The classify LLM's bare `requiresHuman` flag is deliberately NOT a hard
 * signal: it fires on "request is too complex" and routinely misfires on
 * ordinary product questions. Policy treats it as advisory — knowledge is
 * consulted first, and the post-compose gate catches anything truly unsafe.
 */
export function hasHardHumanSignal(
  lastInbound: string | null | undefined,
  classification?: Pick<
    AiClassificationResult,
    "requiresOwner" | "recoveryMode" | "apologyRequired"
  > | null,
): boolean {
  if (isSensitiveInbound(lastInbound)) return true;
  return Boolean(
    classification?.requiresOwner ||
      classification?.recoveryMode ||
      classification?.apologyRequired,
  );
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
      return "Relationship: Existing customer. Focus on helping, not selling. Be supportive with delivery, service, and post-purchase needs.";
    case "win_back":
      return "Relationship: Returning contact. Be warm and welcoming. Show genuine interest in how you can help — no pressure.";
    case "active_deal":
      return "Relationship: Active conversation. Be responsive and clear. Help them move toward a decision naturally.";
    default:
      return "Relationship: New or early conversation. Be welcoming and curious about their needs. Build trust through helpful, honest answers.";
  }
}

/** Intent-specific instructions for the reply composer (sales rep playbook). */
export function playbookForIntent(kind: ReplyIntentKind): string {
  switch (kind) {
    case "greeting":
      return [
        "Playbook: Greeting.",
        "Give a warm, natural welcome. Match their energy — if they sent 'hi', keep it short.",
        "Ask one friendly question about what they need. Don't jump into pricing or product details unless they asked.",
      ].join(" ");
    case "thanks":
      return [
        "Playbook: Thanks.",
        "A simple, warm acknowledgment. Offer to help with anything else — keep it brief and natural.",
      ].join(" ");
    case "test_checkin":
      return [
        "Playbook: Test message.",
        "Confirm you got their message. Sound human and welcoming. Invite them to share what they need.",
      ].join(" ");
    case "pricing":
      return [
        "Playbook: Pricing inquiry.",
        "Share pricing from business knowledge. Be specific — mention plan names, starting prices, what's included.",
        "If exact numbers aren't in the knowledge, share what you know and offer to confirm the specific pricing they need.",
        "Never make up prices. If you truly have no pricing info, say you'll get the details and share them.",
      ].join(" ");
    case "negotiation":
      return [
        "Playbook: Negotiation / price concern.",
        "First acknowledge their concern — show you understand. Don't be defensive.",
        "Highlight the value they get (features, support, quality) using knowledge. Don't just repeat the price.",
        "If they want a discount and you can't offer one, suggest speaking with the team or mention any existing payment flexibility (EMI, plans).",
        "Keep the tone understanding and helpful, not salesy.",
      ].join(" ");
    case "ready_to_buy":
      return [
        "Playbook: Ready to buy.",
        "Great momentum! Confirm what they want and make the next step easy — share payment link, booking URL, or guide them on what to do next.",
        "Keep it simple and smooth. Don't add unnecessary details at this stage.",
      ].join(" ");
    case "follow_up":
      return [
        "Playbook: Follow-up.",
        "Reference what was discussed before. Give a clear update or next step.",
        "If you don't have an update, acknowledge their follow-up and say when they can expect one.",
      ].join(" ");
    case "complaint":
      return [
        "Playbook: Complaint / issue.",
        "Start with genuine empathy. Acknowledge their frustration.",
        "Don't make excuses. Focus on what you can do to help resolve it.",
        "If it needs human attention, connect them with the right person — don't just say 'someone will get back to you.'",
      ].join(" ");
    case "availability_check":
      return [
        "Playbook: Availability check.",
        "Check business knowledge for availability. If available, confirm clearly.",
        "If not in knowledge, ask what specifically they're looking for so you can help better.",
        "Don't confirm availability you're not sure about.",
      ].join(" ");
    case "hours_location":
      return [
        "Playbook: Hours and location.",
        "Share the info clearly and briefly from knowledge. Include Google Maps link if available.",
      ].join(" ");
    case "booking_request":
      return [
        "Playbook: Booking request.",
        "Confirm what they want to book and when. Share booking link from close actions if available.",
        "If no online booking, offer to help schedule and confirm the timing.",
      ].join(" ");
    case "payment_method":
      return [
        "Playbook: Payment method.",
        "List the payment options from knowledge clearly. Share payment link if available.",
        "Keep it simple and helpful.",
      ].join(" ");
    case "product_info":
      return [
        "Playbook: Product / service inquiry.",
        "Share relevant details from knowledge. Be specific about features, benefits, or what makes it valuable.",
        "If the question is broad (like 'what do you offer?'), give a helpful overview and ask what interests them most.",
      ].join(" ");
    default:
      return [
        "Playbook: General inquiry.",
        "Read the message carefully and answer every question. Be helpful and specific.",
        "If it helps the conversation, ask a gentle clarifying question — but don't interrogate.",
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
