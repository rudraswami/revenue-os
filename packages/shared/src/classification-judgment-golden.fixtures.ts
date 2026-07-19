import type { NormalizeClassificationInput } from "./classification-judgment";

/** Anonymized simulated LLM classify outputs for regression (no live API). */
export interface ClassificationGoldenCase {
  name: string;
  base: NormalizeClassificationInput;
  raw: Record<string, unknown>;
  expect: {
    customerNeedsCount?: number;
    unansweredCount?: number;
    language?: string;
    dealTemperature?: string;
    requiresHuman?: boolean;
    requiresOwner?: boolean;
    apologyRequired?: boolean;
    recoveryMode?: boolean;
    replyBriefIncludes?: string;
    ragQueryIncludes?: string[];
    entityKeys?: string[];
  };
}

const defaultBase: NormalizeClassificationInput = {
  stage: "QUALIFIED",
  confidence: 0.82,
  intent: "General inquiry",
  sentiment: "neutral",
  suggestedActions: ["Reply with details"],
  requiresHuman: false,
  summary: "Customer asked a multi-part question.",
  tags: ["inbound"],
  nextAction: "Reply on WhatsApp",
};

export const CLASSIFICATION_GOLDEN_FIXTURES: ClassificationGoldenCase[] = [
  {
    name: "multi-intent price delivery EMI",
    base: { ...defaultBase, intent: "Pricing and logistics" },
    raw: {
      customerNeeds: ["Price for modular kitchen", "Delivery timeline", "EMI options"],
      replyBrief: "Share price range, delivery window, and EMI if available.",
      language: "hinglish",
      dealTemperature: "warm",
      entities: { product: "modular kitchen" },
    },
    expect: {
      customerNeedsCount: 3,
      language: "hinglish",
      dealTemperature: "warm",
      replyBriefIncludes: "EMI",
      ragQueryIncludes: ["modular kitchen", "EMI"],
      entityKeys: ["product"],
    },
  },
  {
    name: "simple greeting no judgment noise",
    base: {
      stage: "NEW",
      confidence: 0.91,
      intent: "Greeting",
      sentiment: "positive",
      suggestedActions: ["Welcome and ask need"],
      requiresHuman: false,
    },
    raw: {
      customerNeeds: ["Say hello"],
      language: "en",
      dealTemperature: "cold",
    },
    expect: {
      customerNeedsCount: 1,
      language: "en",
      dealTemperature: "cold",
    },
  },
  {
    name: "complaint requires empathy",
    base: {
      ...defaultBase,
      stage: "NEGOTIATION",
      intent: "Complaint",
      sentiment: "negative",
      requiresHuman: true,
    },
    raw: {
      customerNeeds: ["Resolution for delayed delivery"],
      apologyRequired: true,
      recoveryMode: true,
      language: "en",
      dealTemperature: "hot",
      unansweredFromCustomer: ["When will my order arrive?"],
    },
    expect: {
      customerNeedsCount: 1,
      unansweredCount: 1,
      apologyRequired: true,
      recoveryMode: true,
      requiresHuman: true,
      dealTemperature: "hot",
    },
  },
  {
    name: "owner-only large deal",
    base: {
      ...defaultBase,
      stage: "PROPOSAL",
      intent: "Enterprise pricing",
      confidence: 0.88,
    },
    raw: {
      customerNeeds: ["Bulk pricing for 50 seats"],
      requiresOwner: true,
      buyingSignals: ["Ready to sign this week"],
      entities: { quantity: "50 seats", budget: "₹5L" },
      language: "en",
    },
    expect: {
      customerNeedsCount: 1,
      requiresOwner: true,
      entityKeys: ["quantity", "budget"],
      ragQueryIncludes: ["50 seats"],
    },
  },
  {
    name: "hindi customer mirror language",
    base: { ...defaultBase, intent: "Pricing inquiry" },
    raw: {
      customerNeeds: ["₹ me kitna padega"],
      language: "hinglish",
      replyBrief: "Hinglish me price batayein; scope confirm karein.",
    },
    expect: {
      customerNeedsCount: 1,
      language: "hinglish",
      replyBriefIncludes: "Hinglish",
    },
  },
  {
    name: "caps oversized need list",
    base: defaultBase,
    raw: {
      customerNeeds: [
        "Need 1",
        "Need 2",
        "Need 3",
        "Need 4",
        "Need 5",
        "Need 6",
        "Need 7",
        "Need 8",
      ],
    },
    expect: { customerNeedsCount: 6 },
  },
  {
    name: "drops invalid enums",
    base: defaultBase,
    raw: {
      language: "spanish",
      dealTemperature: "lukewarm",
      customerNeeds: ["Valid need"],
    },
    expect: {
      customerNeedsCount: 1,
      language: undefined,
      dealTemperature: undefined,
    },
  },
];
