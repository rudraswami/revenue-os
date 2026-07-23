/** Post-compose checks before WhatsApp auto-send (Phase 5 trust rails). */

/**
 * Concrete monetary claims only — not the words "cost" or "price" in prose.
 * Blocks auto-send when the model states ₹/Rs amounts without any retrieved source.
 */
export const GROUNDED_PRICE_CLAIM_PATTERN =
  /₹\s*[\d,]+|rs\.?\s*[\d,]{2,}|\b\d{1,2},\d{3}\b|\b\d{3,}\s*(?:\/\s*mo|per\s*month)\b/i;

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

/** @deprecated Use GROUNDED_PRICE_CLAIM_PATTERN — kept for tests referencing old name. */
export const COMPOSED_PRICE_PATTERN = GROUNDED_PRICE_CLAIM_PATTERN;

export function replyStatesConcretePrice(text: string): boolean {
  return GROUNDED_PRICE_CLAIM_PATTERN.test(text.trim());
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
  const statesConcretePrice = replyStatesConcretePrice(text);

  // Only block invented ₹/Rs amounts — not pricing-intent replies that defer
  // ("I'll confirm the cost") or use the word cost without a number.
  if (statesConcretePrice && !hasSources) {
    return {
      allowed: false,
      blocker: "compose_grounding",
      reason:
        "Reply states a price but isn't grounded in Business Knowledge — draft for your review.",
    };
  }

  return { allowed: true };
}
