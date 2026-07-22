import type { KnowledgeHit, QuickAnswer } from "./intelligence";

/**
 * Deterministic (no-embedding) matching of an inbound customer message against a
 * workspace's structured Quick Answers. Returns `KnowledgeHit`-shaped grounding
 * so quick answers flow through the exact same policy / composer / trust-rail
 * pipeline as indexed knowledge chunks. The `similarity` score reuses the same
 * 0–1 scale, so existing grounding thresholds apply unchanged: a strong match
 * (>= preset minGroundingSimilarity) is auto-send-eligible, a weak match becomes
 * a grounded draft.
 */

/** Minimum score for a quick answer to surface at all (weak → draft grounding). */
export const QUICK_ANSWER_MIN_SCORE = 0.4;

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "am", "do", "does", "did", "you", "your", "we",
  "our", "us", "i", "me", "my", "to", "for", "of", "in", "on", "at", "and", "or",
  "can", "could", "would", "will", "please", "hi", "hello", "hey", "there", "it",
  "this", "that", "with", "how", "what", "when", "where", "any", "have", "has",
]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}₹\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/** 0–1 confidence that this quick answer addresses the inbound message. */
export function scoreQuickAnswer(inbound: string, qa: QuickAnswer): number {
  const inboundNorm = normalizeText(inbound);
  if (!inboundNorm) return 0;

  const inboundTokens = new Set(tokenize(inbound));
  if (inboundTokens.size === 0) return 0;

  const questionTokens = new Set<string>([
    ...tokenize(qa.question),
    ...(qa.keywords ?? []).flatMap((k) => tokenize(k)),
  ]);
  if (questionTokens.size === 0) return 0;

  // Strong signal: a keyword phrase (or the whole question) appears verbatim.
  let phraseHit = false;
  for (const kw of qa.keywords ?? []) {
    const norm = normalizeText(kw);
    if (norm.length >= 3 && inboundNorm.includes(norm)) {
      phraseHit = true;
      break;
    }
  }
  if (!phraseHit) {
    const questionNorm = normalizeText(qa.question);
    if (questionNorm.length >= 6 && inboundNorm.includes(questionNorm)) {
      phraseHit = true;
    }
  }

  let matched = 0;
  for (const token of questionTokens) {
    if (inboundTokens.has(token)) matched += 1;
  }

  // Guard against single-common-word false positives.
  if (matched < 2 && !phraseHit) return 0;

  const coverage = matched / questionTokens.size;
  const recall = matched / inboundTokens.size;
  let score = 0.65 * coverage + 0.35 * recall;
  if (phraseHit) score = Math.max(score, 0.85);

  return Math.min(1, Math.round(score * 100) / 100);
}

/** Best quick-answer matches for an inbound message, as knowledge grounding. */
export function matchQuickAnswers(
  inbound: string | null | undefined,
  quickAnswers: QuickAnswer[] | undefined,
  limit = 3,
): KnowledgeHit[] {
  const text = inbound?.trim();
  if (!text || !quickAnswers?.length) return [];

  return quickAnswers
    .map((qa) => ({ qa, score: scoreQuickAnswer(text, qa) }))
    .filter(({ score }) => score >= QUICK_ANSWER_MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ qa, score }) => ({
      chunkId: `qa:${qa.id}`,
      documentId: "quick-answers",
      title: qa.question,
      content: qa.answer,
      similarity: score,
      category: qa.category ?? "faq",
      citation: `Quick answer: ${qa.question}`,
    }));
}
