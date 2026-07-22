/** Composite score for whether Growvisi can safely auto-answer this turn. */

export const MIN_ANSWERABILITY_FAQ_AUTO = 0.45;
/** Pricing auto-send: grounded enough to cite — post-compose trust rails enforce citation. */
export const MIN_ANSWERABILITY_PRICING_AUTO = 0.55;

export interface AssessAnswerabilityInput {
  groundingConfidence: number;
  hasIndexedChunks: boolean;
  topSimilarity?: number;
  knowledgeGap: boolean;
  knowledgeHitCount: number;
}

export interface AnswerabilityAssessment {
  /** 0–1 composite score */
  score: number;
  canAutoSendFaq: boolean;
  canAutoSendPricing: boolean;
  reason?: string;
}

export function assessAnswerability(input: AssessAnswerabilityInput): AnswerabilityAssessment {
  if (!input.hasIndexedChunks) {
    return {
      score: 0,
      canAutoSendFaq: false,
      canAutoSendPricing: false,
      reason: "Business Knowledge is not indexed yet.",
    };
  }

  if (input.knowledgeGap) {
    return {
      score: Math.min(input.groundingConfidence, 0.35),
      canAutoSendFaq: false,
      canAutoSendPricing: false,
      reason: "Customer question is not covered in Business Knowledge.",
    };
  }

  if (input.knowledgeHitCount === 0) {
    return {
      score: 0,
      canAutoSendFaq: false,
      canAutoSendPricing: false,
      reason: "No matching knowledge for this question.",
    };
  }

  const topSim = input.topSimilarity ?? 0;
  const score = Math.round(
    Math.min(1, input.groundingConfidence * 0.55 + topSim * 0.45) * 100,
  ) / 100;

  const canAutoSendFaq = score >= MIN_ANSWERABILITY_FAQ_AUTO;
  // One grounded-with-citation bar (not three stacked floors). Trust rails
  // still block invented prices after compose.
  const canAutoSendPricing = score >= MIN_ANSWERABILITY_PRICING_AUTO && topSim >= 0.5;

  let reason: string | undefined;
  if (!canAutoSendFaq) {
    reason = "Knowledge match is not strong enough to auto-send safely.";
  }

  return { score, canAutoSendFaq, canAutoSendPricing, reason };
}
