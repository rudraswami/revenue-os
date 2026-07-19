/** Post-compose checks before WhatsApp auto-send (Phase 5 trust rails). */

const COMPOSED_PRICE_PATTERN =
  /₹|rs\.?\s*\d{2,}|\d{1,2},\d{3}|\d+\s*\/\s*mo|per month|\/month|price is|costs? /i;

const COURTESY_INTENTS = new Set(["greeting", "thanks", "ack", "test_checkin"]);

export interface ComposedReplyTrustInput {
  text: string;
  sources: Array<{ similarity?: number }>;
  /** Template fast-reply — already policy-approved. */
  isFastPath: boolean;
  intentKind?: string;
  minGroundingSimilarity?: number;
}

export interface ComposedReplyTrustResult {
  allowed: boolean;
  blocker?: string;
  reason?: string;
}

export function validateComposedReplyForSend(
  input: ComposedReplyTrustInput,
): ComposedReplyTrustResult {
  const text = input.text.trim();
  if (!text) {
    return {
      allowed: false,
      blocker: "empty_reply",
      reason: "Empty reply — draft for your review.",
    };
  }

  if (input.isFastPath) {
    return { allowed: true };
  }

  const intent = input.intentKind ?? "general";
  if (COURTESY_INTENTS.has(intent)) {
    return { allowed: true };
  }

  const hasSources = input.sources.length > 0;
  const topSimilarity = hasSources
    ? Math.max(...input.sources.map((s) => s.similarity ?? 0))
    : 0;
  const minSim = input.minGroundingSimilarity ?? 0.65;
  const mentionsPrice = COMPOSED_PRICE_PATTERN.test(text);
  const pricingIntent = intent === "pricing" || intent === "negotiation" || intent === "ready_to_buy";

  if ((mentionsPrice || pricingIntent) && !hasSources) {
    return {
      allowed: false,
      blocker: "compose_grounding",
      reason:
        "Reply mentions pricing but isn't grounded in Business Knowledge — draft for your review.",
    };
  }

  if (pricingIntent && hasSources && topSimilarity < minSim) {
    return {
      allowed: false,
      blocker: "compose_weak_grounding",
      reason: "Pricing reply isn't grounded enough — draft for your review.",
    };
  }

  return { allowed: true };
}
