/**
 * Normalize INR amounts in knowledge text so retrieval gap detection and
 * compose grounding recognize bare numbers (e.g. "Solo Plan: 999").
 */
export function normalizeInrPricingInContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return content;

  let out = content;

  // "Solo Plan: 999" / "Team Plan - 2,599" → prefix ₹ when missing.
  out = out.replace(
    /\b((?:[A-Za-z][\w\s&]*)?Plan)\s*([:–-])\s*(?!₹|Rs\.?\s*)(\d[\d,]*)/gi,
    (_match, plan: string, sep: string, amount: string) => `${plan.trim()}${sep} ₹${amount}`,
  );

  // Bullet lines: "- Feature pack: 999/mo"
  out = out.replace(
    /^(\s*[-•*]\s*[^:\n]+:\s*)(?!₹|Rs\.?\s*)(\d[\d,]{2,})(\s*(?:\/mo|\/month|per month))?$/gim,
    (_match, prefix: string, amount: string, suffix = "") => `${prefix}₹${amount}${suffix}`,
  );

  return out;
}

/** Whether retrieved corpus contains usable pricing facts for gap detection. */
export function corpusHasPricingSignals(corpus: string): boolean {
  if (/₹|rs\.?\s*\d|\d+\s*\/\s*mo|per month|\/month|rate card/i.test(corpus)) {
    return true;
  }
  // Bare plan prices from crawls/imports without currency symbol.
  return /\bplan\s*[:–-]\s*₹?\s*\d[\d,]{2,}/i.test(corpus);
}
