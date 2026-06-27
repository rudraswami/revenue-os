import { ENTERPRISE_OFFERING, OUTCOME_TIERS, POSITIONING } from "./gtm-copy";

export type PricingPlan = {
  id: string;
  name: string;
  tagline: string;
  forWho: string;
  price: number | null;
  features: string[];
  popular: boolean;
  custom: boolean;
  checkoutPlanId?: "starter" | "growth" | "pro";
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: OUTCOME_TIERS.solo.name,
    tagline: OUTCOME_TIERS.solo.promise,
    forWho: OUTCOME_TIERS.solo.forWho,
    price: OUTCOME_TIERS.solo.priceInr,
    features: [
      "1 WhatsApp number · 2 team members",
      "3,000 classified leads / month",
      "Shared inbox + pipeline + contacts",
      "AI intent & lead score*",
      "Connection health + revenue Home pulse",
    ],
    popular: false,
    custom: false,
    checkoutPlanId: "starter",
  },
  {
    id: "growth",
    name: OUTCOME_TIERS.team.name,
    tagline: OUTCOME_TIERS.team.promise,
    forWho: OUTCOME_TIERS.team.forWho,
    price: OUTCOME_TIERS.team.priceInr,
    features: [
      "3 WhatsApp numbers · 5 team members",
      "3,000 classified leads / month",
      "One-click Take over (handoff → task)",
      "WhatsApp campaigns + click-to-WA attribution",
      "Razorpay payment → Won · won/lost analytics",
    ],
    popular: true,
    custom: false,
    checkoutPlanId: "growth",
  },
  {
    id: "pro",
    name: OUTCOME_TIERS.operator.name,
    tagline: OUTCOME_TIERS.operator.promise,
    forWho: OUTCOME_TIERS.operator.forWho,
    price: OUTCOME_TIERS.operator.priceInr,
    features: [
      "Up to 50 numbers · 50 team members",
      "1,00,000 leads / month · 15 client workspaces",
      "Morning digest on email or WhatsApp (Hindi)",
      "API keys + outbound webhooks",
      "Partner install kit for Meta + Growvisi stack",
    ],
    popular: false,
    custom: false,
    checkoutPlanId: "pro",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: ENTERPRISE_OFFERING.tagline,
    forWho: ENTERPRISE_OFFERING.forWho,
    price: null,
    features: [...ENTERPRISE_OFFERING.features],
    popular: false,
    custom: true,
  },
];

export const PRICING_FOOTNOTES = [
  POSITIONING.trialNote,
  POSITIONING.replyNote,
  "* AI classification requires OpenAI on your Growvisi deployment.",
] as const;
