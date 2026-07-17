/**
 * Founder GTM copy — positioning, tiers, activation.
 * Single source for marketing + in-product merchandising.
 */

export const POSITIONING = {
  oneLiner: "The revenue layer for WhatsApp sales teams.",
  headline: "WhatsApp conversations in. Pipeline ₹ out.",
  subhead:
    "AI classifies every lead and flags when a human should step in. Your team replies from Inbox — Growvisi tracks pipeline, handoffs, and revenue ₹.",
  dashboardSubhead:
    "AI classifies inbound WhatsApp — you reply from Inbox when customers need a person. Pipeline and revenue ₹ stay visible here.",
  replyNote:
    "Growvisi AI never auto-replies to customers. Your team sends human messages from Inbox (or WhatsApp directly). Optional Meta Business Agent can handle first-line FAQ in the WhatsApp app.",
  trialNote: "14-day trial · 500 leads · 1 WhatsApp number · No credit card",
} as const;

/** What “your turn” means in product — use in FAQ, onboarding, sales */
export const HANDOFF_EXPLAINER = {
  short: "When AI decides a customer needs a person, the chat is flagged for your team.",
  steps: [
    "AI classifies the message and may mark the thread as waiting on you.",
    "Conversations shows a Your turn filter; Home and digest alert your team.",
    "I'll reply now assigns the deal to you, creates a task, and clears the alert.",
    "You reply from Conversations or in WhatsApp — Growvisi never auto-messages customers.",
  ],
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
    forWho: "Agencies & multi-location teams · includes Agency hub",
  },
} as const;

/**
 * Enterprise — custom contract on top of Operator.
 * Only list capabilities that exist in product today or are standard sales commitments.
 */
export const ENTERPRISE_OFFERING = {
  tagline: "Franchise & large agency rollouts",
  forWho: "15+ clients, franchise chains, or SLA needs",
  features: [
    "Custom lead volume & WhatsApp number limits (beyond Operator caps)",
    "20+ client workspaces — franchise / multi-brand agency rollouts",
    "Audit log export for billing & pipeline change reviews",
    "Dedicated rollout: Meta + Growvisi partner install per location",
    "Priority support, uptime SLA & Hindi digest at scale",
  ],
  contactReasons: [
    "More than 15 agency clients on one hub",
    "100k+ leads/month across many numbers",
    "Franchise onboarding across 10+ cities",
    "Compliance review of audit trail & DPA",
  ],
} as const;

/** Activation milestones — north star for product UX */
export const ACTIVATION_GOALS = {
  connectWhatsapp: "Connect WhatsApp",
  firstClassification: "See AI classify in Inbox",
  pipelineMove: "Move a deal on Pipeline",
  digestEnabled: "Turn on morning digest",
  dealValue: "Add ₹ value to a deal",
} as const;
