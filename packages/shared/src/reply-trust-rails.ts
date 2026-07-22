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
  const mentionsPrice = COMPOSED_PRICE_PATTERN.test(text);

  // Fact-based guard (NOT keyword/intent based): the only thing we refuse to
  // auto-send is a reply that states a concrete price/number while having zero
  // retrieved sources to ground it — that's a hallucinated price. If the reply
  // is grounded in ANY source, we trust the composer (it was handed the
  // grounded knowledge block) and send. Pricing questions are core sales
  // conversations and must flow, not stall in drafts.
  if (mentionsPrice && !hasSources) {
    return {
      allowed: false,
      blocker: "compose_grounding",
      reason:
        "Reply states a price but isn't grounded in Business Knowledge — draft for your review.",
    };
  }

  return { allowed: true };
}
