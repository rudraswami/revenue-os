/**
 * Founder GTM copy — positioning, tiers, activation.
 * Single source for marketing + in-product merchandising.
 */

export const POSITIONING = {
  oneLiner: "The revenue layer for WhatsApp sales teams.",
  headline: "Meta replies in WhatsApp. Growvisi tracks every deal in ₹.",
  subhead:
    "Classify leads, move pipeline, alert your team, and report revenue — without replacing Meta Business Agent in chat.",
  metaNote:
    "Customer replies happen in WhatsApp via Meta Business Agent. Growvisi classifies, assigns, and measures outcomes.",
  trialNote: "14-day trial · 500 leads · 1 WhatsApp number · No credit card",
} as const;

/** Outcome tier names (maps to starter / growth / pro in billing) */
export const OUTCOME_TIERS = {
  solo: {
    id: "starter" as const,
    name: "Solo",
    priceInr: 999,
    promise: "Never lose a WhatsApp lead again",
    forWho: "Owner + 1 helper",
  },
  team: {
    id: "growth" as const,
    name: "Team",
    priceInr: 2999,
    promise: "Everyone knows who owns which deal",
    forWho: "3–5 person sales team",
  },
  operator: {
    id: "pro" as const,
    name: "Operator",
    priceInr: 5999,
    promise: "Run many WhatsApp businesses from one hub",
    forWho: "Agencies & multi-brand ops",
  },
} as const;

/** Activation milestones — north star for product UX */
export const ACTIVATION_GOALS = {
  connectWhatsapp: "Connect WhatsApp",
  firstClassification: "See AI classify in Inbox",
  pipelineMove: "Move a deal on Pipeline",
  digestEnabled: "Turn on morning digest",
  dealValue: "Add ₹ value to a deal",
} as const;
