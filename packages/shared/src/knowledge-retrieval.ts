import type { KnowledgeCategory, KnowledgeHit } from "./intelligence";

/** Intent kinds used to route knowledge category filters. */
export type RetrievalIntentKind =
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

export interface RetrievalResult {
  hits: KnowledgeHit[];
  missingTopics: string[];
  /** 0–1 confidence that retrieved chunks can ground a reply. */
  groundingConfidence: number;
  categoriesUsed?: KnowledgeCategory[];
  hasIndexedChunks: boolean;
}

export interface DetectMissingTopicsInput {
  intentKind?: string;
  lastInbound?: string | null;
  customerNeeds?: string[];
  hits: KnowledgeHit[];
  /** When false, org has no indexed KB — gap detection is deferred. */
  hasIndexedChunks?: boolean;
}

const PRICING_TOPIC_PATTERN =
  /pric|cost|fee|rate|package|plan|₹|rs\.?\s*\d|discount|quote|emi|payment|how much/i;
const POLICY_TOPIC_PATTERN =
  /refund|return policy|warranty|guarantee|complaint|cancel|exchange/i;
const DELIVERY_TOPIC_PATTERN = /deliver|shipping|dispatch|timeline|turnaround/i;
const EMI_TOPIC_PATTERN = /emi|installment|payment plan|financ/i;
const AVAILABILITY_TOPIC_PATTERN = /availab|stock|in stock|milega|mil jayega|do you have/i;
const HOURS_LOCATION_TOPIC_PATTERN = /where|location|address|timing|hours|open|close|kahan|direction|shop|store|office|visit/i;
const PAYMENT_METHOD_TOPIC_PATTERN = /upi|gpay|paytm|phonepe|card|cash|cod|net bank|neft|imps|payment.*method|how.*pay/i;

/** Map conversation intent to preferred knowledge categories for vector search. */
export function resolveRetrievalCategories(
  intentKind?: string,
): KnowledgeCategory[] | undefined {
  switch (intentKind) {
    case "pricing":
    case "negotiation":
    case "ready_to_buy":
      return ["pricing", "product"];
    case "complaint":
      return ["policy", "faq"];
    case "availability_check":
    case "product_info":
      return ["product", "faq"];
    case "hours_location":
      return ["general", "faq"];
    case "booking_request":
      return ["faq", "product"];
    case "payment_method":
      return ["faq", "pricing"];
    default:
      return undefined;
  }
}

function hitCorpus(hits: KnowledgeHit[]): string {
  return hits.map((h) => `${h.title} ${h.content} ${h.category}`).join(" ").toLowerCase();
}

function hasCategory(hits: KnowledgeHit[], category: KnowledgeCategory): boolean {
  return hits.some((h) => h.category === category);
}

function corpusMatches(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

/** Topic-aware gap detection — extends beyond pricing-only checks. */
export function detectMissingTopics(input: DetectMissingTopicsInput): string[] {
  if (input.hasIndexedChunks === false) return [];

  const topics: string[] = [];
  const corpus = hitCorpus(input.hits);
  const inbound = `${input.lastInbound ?? ""}`;
  const needs = input.customerNeeds ?? [];

  const needsPricing =
    input.intentKind === "pricing" ||
    input.intentKind === "negotiation" ||
    input.intentKind === "ready_to_buy" ||
    PRICING_TOPIC_PATTERN.test(inbound) ||
    needs.some((n) => PRICING_TOPIC_PATTERN.test(n));

  if (
    needsPricing &&
    (input.hits.length === 0 ||
      (!hasCategory(input.hits, "pricing") && !corpusMatches(corpus, PRICING_TOPIC_PATTERN)))
  ) {
    topics.push("pricing or packages");
  }

  const needsPolicy =
    input.intentKind === "complaint" ||
    POLICY_TOPIC_PATTERN.test(inbound) ||
    needs.some((n) => POLICY_TOPIC_PATTERN.test(n));

  if (
    needsPolicy &&
    (input.hits.length === 0 ||
      (!hasCategory(input.hits, "policy") && !corpusMatches(corpus, POLICY_TOPIC_PATTERN)))
  ) {
    topics.push("policy or returns");
  }

  const needsDelivery =
    DELIVERY_TOPIC_PATTERN.test(inbound) ||
    needs.some((n) => DELIVERY_TOPIC_PATTERN.test(n));

  if (needsDelivery && !corpusMatches(corpus, DELIVERY_TOPIC_PATTERN)) {
    topics.push("delivery or shipping");
  }

  const needsEmi =
    EMI_TOPIC_PATTERN.test(inbound) || needs.some((n) => EMI_TOPIC_PATTERN.test(n));

  if (needsEmi && !corpusMatches(corpus, EMI_TOPIC_PATTERN)) {
    topics.push("EMI or payment plans");
  }

  const needsAvailability =
    input.intentKind === "availability_check" ||
    AVAILABILITY_TOPIC_PATTERN.test(inbound) ||
    needs.some((n) => AVAILABILITY_TOPIC_PATTERN.test(n));

  if (needsAvailability && !corpusMatches(corpus, AVAILABILITY_TOPIC_PATTERN)) {
    topics.push("product availability");
  }

  const needsHoursLocation =
    input.intentKind === "hours_location" ||
    HOURS_LOCATION_TOPIC_PATTERN.test(inbound) ||
    needs.some((n) => HOURS_LOCATION_TOPIC_PATTERN.test(n));

  if (needsHoursLocation && !corpusMatches(corpus, HOURS_LOCATION_TOPIC_PATTERN)) {
    topics.push("business hours or location");
  }

  const needsPaymentMethod =
    input.intentKind === "payment_method" ||
    PAYMENT_METHOD_TOPIC_PATTERN.test(inbound) ||
    needs.some((n) => PAYMENT_METHOD_TOPIC_PATTERN.test(n));

  if (needsPaymentMethod && !corpusMatches(corpus, PAYMENT_METHOD_TOPIC_PATTERN)) {
    topics.push("accepted payment methods");
  }

  return [...new Set(topics)];
}

/** Rank hits by category preference, then similarity. */
export function rankKnowledgeHits(
  hits: KnowledgeHit[],
  preferredCategories?: KnowledgeCategory[],
): KnowledgeHit[] {
  if (!preferredCategories?.length) {
    return [...hits].sort((a, b) => b.similarity - a.similarity);
  }
  const pref = new Set(preferredCategories);
  return [...hits].sort((a, b) => {
    const aPref = pref.has(a.category as KnowledgeCategory) ? 1 : 0;
    const bPref = pref.has(b.category as KnowledgeCategory) ? 1 : 0;
    if (bPref !== aPref) return bPref - aPref;
    return b.similarity - a.similarity;
  });
}

export function computeGroundingConfidence(
  hits: KnowledgeHit[],
  preferredCategories?: KnowledgeCategory[],
): number {
  if (hits.length === 0) return 0;
  const ranked = rankKnowledgeHits(hits, preferredCategories);
  const top = ranked[0];
  const categoryBoost =
    preferredCategories?.includes(top.category as KnowledgeCategory) ? 0.1 : 0;
  return Math.min(1, Math.round((top.similarity + categoryBoost) * 100) / 100);
}

export interface KnowledgeHealthSummary {
  docCount: number;
  chunkCount: number;
  /** Curated structured FAQ/price pairs (count as grounding without uploads). */
  quickAnswerCount: number;
  lastIndexedAt: string | null;
  /** 0–100 — higher means more auto-send risk from missing KB coverage. */
  gapRiskScore: number;
  /** Responsive preset requires indexed chunks OR quick answers (server-enforced). */
  readyForResponsivePreset: boolean;
}

/** Workspace-level KB coverage risk for health dashboards and preset gates. */
export function computeGapRiskScore(input: {
  chunkCount: number;
  docCount: number;
}): number {
  if (input.chunkCount === 0) return 100;
  if (input.chunkCount < 5) return 80;
  if (input.chunkCount < 15) return 50;
  if (input.docCount < 2) return 35;
  return 15;
}

export function buildRetrievalResult(input: {
  hits: KnowledgeHit[];
  intentKind?: string;
  lastInbound?: string | null;
  customerNeeds?: string[];
  hasIndexedChunks: boolean;
  categoriesUsed?: KnowledgeCategory[];
}): RetrievalResult {
  const categoriesUsed =
    input.categoriesUsed ?? resolveRetrievalCategories(input.intentKind);
  const hits = rankKnowledgeHits(input.hits, categoriesUsed);
  const missingTopics = detectMissingTopics({
    intentKind: input.intentKind,
    lastInbound: input.lastInbound,
    customerNeeds: input.customerNeeds,
    hits,
    hasIndexedChunks: input.hasIndexedChunks,
  });
  const groundingConfidence = computeGroundingConfidence(hits, categoriesUsed);
  return {
    hits,
    missingTopics,
    groundingConfidence,
    categoriesUsed,
    hasIndexedChunks: input.hasIndexedChunks,
  };
}
