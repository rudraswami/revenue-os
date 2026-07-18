import type { AiClassificationResult, LeadStage } from "@growvisi/shared";
import { isSimpleGreeting } from "@growvisi/shared";

export type ReplyIntentKind =
  | "greeting"
  | "thanks"
  | "test_checkin"
  | "pricing"
  | "negotiation"
  | "ready_to_buy"
  | "follow_up"
  | "complaint"
  | "general";

const PRICING_MSG =
  /pric|cost|fee|rate|package|plan|₹|rs\.?\s*\d|discount|quote|emi|payment|how much/i;
const TEST_MSG = /^(test(ing)?|hello\s*test|hi\s*test)[\s!.?]*$/i;
const THANKS_MSG = /^(thanks?|thank\s*you|thx|dhanyavaad|shukriya)[\s!.?]*$/i;
const BUY_MSG = /ready to (buy|order|purchase)|let'?s (proceed|go ahead)|book\s*now|place\s*order/i;

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
    (/negotiat|discount/i.test(msg) && PRICING_MSG.test(msg))
  ) {
    return "negotiation";
  }

  if (PRICING_MSG.test(msg) || /pricing|price inquiry|cost/i.test(intentText)) {
    return "pricing";
  }

  if (/follow.?up|checking in|any update|status/i.test(msg) || /follow up/i.test(intentText)) {
    return "follow_up";
  }

  return "general";
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
        "Playbook: Negotiation",
        "Empathize. Understand budget/constraints. Do not commit to discounts without policy docs.",
        "Move toward a call or human follow-up if terms are unclear.",
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
    default:
      return [
        "Playbook: General",
        "Read the latest message carefully. Be helpful, specific, and conversational.",
      ].join(" ");
  }
}

export function buildRagQuery(
  lastInbound: string | null | undefined,
  classification?: Pick<AiClassificationResult, "intent" | "summary"> | null,
): string {
  const parts = [lastInbound, classification?.intent, classification?.summary]
    .filter((p) => typeof p === "string" && p.trim().length > 0)
    .map((p) => String(p).trim());
  return parts.join(" — ").slice(0, 500) || "customer inquiry";
}
