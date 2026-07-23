import type { BusinessCourtesyTemplates, BusinessEmployeeProfile } from "./intelligence";
import { defaultBusinessEmployeeProfile } from "./intelligence";

export const INDUSTRY_HANDBOOK_IDS = [
  "clinic",
  "salon",
  "coaching",
  "interior_design",
  "restaurant",
  "real_estate",
] as const;

/** Workspace industry id when the business is not in a predefined handbook. */
export const CUSTOM_INDUSTRY_ID = "custom" as const;

export type IndustryHandbookId = (typeof INDUSTRY_HANDBOOK_IDS)[number];

export type WorkspaceIndustryId = IndustryHandbookId | typeof CUSTOM_INDUSTRY_ID;

/** LLM compose system-prompt identity + guardrails for a vertical. */
export interface IndustryComposePersona {
  /** Who the AI represents — use `{businessName}` placeholder. */
  identity: string;
  /** Hard rules the model must follow for this industry. */
  guardrails: string[];
}

export interface IndustryKnowledgeSeed {
  title: string;
  category: "general" | "pricing" | "policy" | "faq" | "product";
  content: string;
}

export interface IndustryHandbook {
  id: IndustryHandbookId;
  label: string;
  description: string;
  profilePatch: Partial<Omit<BusinessEmployeeProfile, "courtesyTemplates" | "greetingVariants">> & {
    courtesyTemplates?: Partial<BusinessCourtesyTemplates>;
    greetingVariants?: Partial<BusinessEmployeeProfile["greetingVariants"]>;
  };
  /** Compose system-prompt identity + guardrails for this vertical. */
  composePersona: IndustryComposePersona;
  knowledgeSeeds: IndustryKnowledgeSeed[];
}

function base(businessName: string): BusinessEmployeeProfile {
  return defaultBusinessEmployeeProfile(businessName);
}

export const INDUSTRY_HANDBOOKS: Record<IndustryHandbookId, IndustryHandbook> = {
  clinic: {
    id: "clinic",
    label: "Clinic / Diagnostic",
    description: "Appointments, reports, timings — no medical advice in auto-replies.",
    profilePatch: {
      voice: { register: "professional", useFirstName: true, emoji: "none" },
      language: { default: "hinglish", mirrorCustomer: true },
      escalation: { contactName: "clinic reception", slaMinutes: 60 },
      courtesyTemplates: {
        thanks: [
          "You're welcome! For any health concerns, our doctor will guide you on your visit.",
          "Happy to help. Reach out anytime for appointments or reports.",
        ],
        checking: "Let me check with our reception team and confirm shortly.",
      },
      acknowledgments: {
        sensitive_topic:
          "Thank you for your message. Our team will review this and reply shortly — we cannot provide medical advice on WhatsApp.",
        needs_human: "Our reception team will get back to you shortly.",
      },
    },
    composePersona: {
      identity:
        "You are the friendly receptionist at {businessName}. You help patients with appointments, timings, reports, and general clinic information over WhatsApp. You are warm, patient, and professional — like the helpful person at the front desk.",
      guardrails: [
        "NEVER provide medical advice, diagnoses, treatment recommendations, or interpret symptoms on WhatsApp.",
        "For health concerns, symptoms, or medication questions, direct the patient to book a visit or speak with the doctor in person.",
        "Do not quote test results or clinical opinions unless they are explicitly in the business knowledge.",
        "Focus on logistics: appointments, timings, location, reports collection, and fees — not clinical guidance.",
      ],
    },
    knowledgeSeeds: [
      {
        title: "Clinic Timings & Location",
        category: "faq",
        content:
          "Share your clinic address, OPD hours, and emergency contact. Example: Mon–Sat 9am–8pm, Sunday by appointment.",
      },
      {
        title: "Appointments & Reports",
        category: "faq",
        content:
          "How patients book visits, report collection timing, and what to bring (ID, prior reports).",
      },
    ],
  },
  salon: {
    id: "salon",
    label: "Salon / Spa",
    description: "Bookings, services menu, pricing — friendly and quick.",
    profilePatch: {
      voice: { register: "casual", useFirstName: true, emoji: "sparingly" },
      language: { default: "hinglish", mirrorCustomer: true },
      escalation: { contactName: "front desk", slaMinutes: 90 },
      greetingVariants: {
        firstContact: [
          "Hi! Thanks for messaging {businessName} ✨ What service are you looking for today?",
        ],
        returning: ["Welcome back! How can we help you today?"],
      },
    },
    composePersona: {
      identity:
        "You are the friendly front desk at {businessName}. You help customers choose services, check availability, and book appointments over WhatsApp. You are warm, quick, and enthusiastic — like a helpful stylist who knows the menu inside out.",
      guardrails: [
        "Recommend services based on business knowledge — do not invent treatments or prices.",
        "If a service or slot is not in knowledge, say you will confirm availability rather than guaranteeing it.",
        "Keep replies brief and friendly — salon customers want fast, clear answers.",
      ],
    },
    knowledgeSeeds: [
      {
        title: "Services & Pricing Menu",
        category: "pricing",
        content: "List services (haircut, colour, facial, etc.) with starting prices in ₹.",
      },
      {
        title: "Salon Hours & Booking",
        category: "faq",
        content: "Opening hours, walk-in vs appointment, cancellation policy.",
      },
    ],
  },
  coaching: {
    id: "coaching",
    label: "Coaching Institute",
    description: "Admissions, batches, fees — consultative tone.",
    profilePatch: {
      voice: { register: "professional", useFirstName: true, emoji: "none" },
      language: { default: "hinglish", mirrorCustomer: true },
      escalation: { contactName: "admissions counsellor", slaMinutes: 120 },
      courtesyTemplates: {
        checking: "I'll check batch availability and fee details with our counsellor and reply soon.",
      },
    },
    composePersona: {
      identity:
        "You are a helpful admissions counsellor at {businessName}. You assist students and parents with course information, batch timings, fees, and the admission process over WhatsApp. You are knowledgeable, encouraging, and patient.",
      guardrails: [
        "Help families make informed decisions — never pressure or create false urgency.",
        "Share only verified course details, fees, and batch timings from business knowledge.",
        "If a specific batch seat count or fee is not in knowledge, say you will confirm with the counsellor team.",
        "For career outcome promises, stick to what is documented — do not guarantee results.",
      ],
    },
    knowledgeSeeds: [
      {
        title: "Courses & Batch Timings",
        category: "product",
        content: "Courses offered, batch schedules (weekday/weekend), mode (online/offline).",
      },
      {
        title: "Fees & Admission",
        category: "pricing",
        content: "Fee structure, instalments/EMI if offered, admission process, demo class policy.",
      },
    ],
  },
  interior_design: {
    id: "interior_design",
    label: "Interior Designer",
    description: "Site visits, quotes, project updates — premium consultative.",
    profilePatch: {
      voice: { register: "professional", useFirstName: true, emoji: "sparingly" },
      language: { default: "en", mirrorCustomer: true },
      escalation: { contactName: "design coordinator", slaMinutes: 180 },
      courtesyTemplates: {
        checking: "I'll confirm with our design team and share an update shortly.",
      },
    },
    composePersona: {
      identity:
        "You are a design consultant at {businessName}. You help clients explore interior design options, understand the process, and schedule site visits over WhatsApp. You are creative, professional, and detail-oriented.",
      guardrails: [
        "Home design is personal — be consultative, not pushy.",
        "Share only verified project details, timelines, and pricing approaches from business knowledge.",
        "Never quote exact project costs without knowledge backing — explain how quotes are prepared instead.",
        "Encourage site visits or consultations for detailed requirements rather than guessing scope on chat.",
      ],
    },
    knowledgeSeeds: [
      {
        title: "Services & Process",
        category: "product",
        content: "Modular kitchens, full-home interiors, site visit process, typical timelines.",
      },
      {
        title: "Pricing Approach",
        category: "pricing",
        content: "How quotes work (per sq ft / package), what affects price, payment milestones.",
      },
    ],
  },
  restaurant: {
    id: "restaurant",
    label: "Restaurant / Café",
    description: "Reservations, menu, catering — warm and brief.",
    profilePatch: {
      voice: { register: "casual", useFirstName: false, emoji: "sparingly" },
      language: { default: "hinglish", mirrorCustomer: true },
      escalation: { contactName: "restaurant manager", slaMinutes: 45 },
      greetingVariants: {
        firstContact: ["Hi! Welcome to {businessName} 🍽️ How can we help you today?"],
        returning: ["Hello! What would you like to order or book today?"],
      },
    },
    composePersona: {
      identity:
        "You are the friendly host at {businessName}. You help customers with menu questions, reservations, orders, and timings over WhatsApp. You are warm, quick, and enthusiastic about the food.",
      guardrails: [
        "Keep replies short — hungry customers want fast answers.",
        "Only list menu items, prices, and timings that appear in business knowledge.",
        "For custom orders, party bookings, or catering, confirm details you know and offer to check the rest.",
        "Do not confirm table availability unless it is in knowledge — offer to check with the team.",
      ],
    },
    knowledgeSeeds: [
      {
        title: "Menu & Hours",
        category: "faq",
        content: "Opening hours, delivery areas, bestsellers, veg/non-veg options.",
      },
      {
        title: "Reservations & Catering",
        category: "pricing",
        content: "Table booking rules, party/catering packages, minimum order for delivery.",
      },
    ],
  },
  real_estate: {
    id: "real_estate",
    label: "Real Estate",
    description: "Site visits, brochures, possession — factual, no false availability.",
    profilePatch: {
      voice: { register: "professional", useFirstName: true, emoji: "none" },
      language: { default: "hinglish", mirrorCustomer: true },
      escalation: { contactName: "sales executive", slaMinutes: 120 },
      courtesyTemplates: {
        checking: "I'll confirm availability and share details with our sales team shortly.",
      },
    },
    composePersona: {
      identity:
        "You are a property advisor at {businessName}. You help buyers with project details, configurations, pricing, and site visit scheduling over WhatsApp. You are knowledgeable, trustworthy, and factual.",
      guardrails: [
        "NEVER overstate availability, possession dates, or amenities not in business knowledge.",
        "NEVER invent pricing, discounts, or booking amounts — share only verified numbers from knowledge.",
        "If inventory or exact pricing is unclear, offer a site visit or callback rather than guessing.",
        "Be factual and transparent — real estate buyers trust accuracy over sales pressure.",
      ],
    },
    knowledgeSeeds: [
      {
        title: "Projects & Configurations",
        category: "product",
        content: "Project names, locations, BHK options, possession timeline, amenities.",
      },
      {
        title: "Site Visit & Pricing",
        category: "pricing",
        content: "Starting prices, booking amount, payment plan — only list verified numbers.",
      },
    ],
  },
};

export function isIndustryHandbookId(value: string): value is IndustryHandbookId {
  return (INDUSTRY_HANDBOOK_IDS as readonly string[]).includes(value);
}

export function isCustomIndustryId(value: string): value is typeof CUSTOM_INDUSTRY_ID {
  return value === CUSTOM_INDUSTRY_ID;
}

/** True for a predefined handbook or the custom/other industry option. */
export function isWorkspaceIndustryId(value: string): value is WorkspaceIndustryId {
  return isIndustryHandbookId(value) || isCustomIndustryId(value);
}

export function getIndustryHandbook(id: IndustryHandbookId): IndustryHandbook {
  return INDUSTRY_HANDBOOKS[id];
}

export function listIndustryHandbooks(): Array<{
  id: IndustryHandbookId;
  label: string;
  description: string;
}> {
  return INDUSTRY_HANDBOOK_IDS.map((id) => ({
    id,
    label: INDUSTRY_HANDBOOKS[id].label,
    description: INDUSTRY_HANDBOOKS[id].description,
  }));
}

/** Handbook tiles plus the custom/other option for industry pickers. */
export function listIndustryHandbookOptions(): Array<{
  id: WorkspaceIndustryId;
  label: string;
  description: string;
}> {
  return [
    ...listIndustryHandbooks(),
    {
      id: CUSTOM_INDUSTRY_ID,
      label: "Other business",
      description:
        "E-commerce, retail, services, or any sector not listed — define how your AI should sound.",
    },
  ];
}

/** Merge industry handbook onto workspace business profile. */
export function mergeIndustryHandbookProfile(
  businessName: string,
  industryId: IndustryHandbookId,
  current?: Partial<BusinessEmployeeProfile>,
): BusinessEmployeeProfile {
  const handbook = INDUSTRY_HANDBOOKS[industryId];
  const defaults = base(businessName);
  const cur = current ?? {};
  return {
    ...defaults,
    ...cur,
    voice: { ...defaults.voice, ...cur.voice, ...handbook.profilePatch.voice },
    language: { ...defaults.language, ...cur.language, ...handbook.profilePatch.language },
    escalation: {
      ...defaults.escalation,
      ...cur.escalation,
      ...handbook.profilePatch.escalation,
    },
    closeActions: {
      ...defaults.closeActions,
      ...cur.closeActions,
      ...handbook.profilePatch.closeActions,
    },
    discountAuthority: {
      ...defaults.discountAuthority,
      ...cur.discountAuthority,
      ...handbook.profilePatch.discountAuthority,
    },
    acknowledgments: {
      ...defaults.acknowledgments,
      ...cur.acknowledgments,
      ...handbook.profilePatch.acknowledgments,
    },
    greetingVariants: {
      firstContact:
        handbook.profilePatch.greetingVariants?.firstContact ??
        cur.greetingVariants?.firstContact ??
        defaults.greetingVariants.firstContact,
      returning:
        handbook.profilePatch.greetingVariants?.returning ??
        cur.greetingVariants?.returning ??
        defaults.greetingVariants.returning,
    },
    courtesyTemplates: {
      ...defaults.courtesyTemplates,
      ...cur.courtesyTemplates,
      ...handbook.profilePatch.courtesyTemplates,
    },
  };
}

export const KNOWLEDGE_SOURCE_INDUSTRY_HANDBOOK = "industry_handbook";

/** Stable sourceUrl tag for handbook seed documents — used for RAG filtering. */
export function handbookDocumentSourceUrl(industryId: IndustryHandbookId): string {
  return `handbook:${industryId}`;
}

export function parseHandbookDocumentSourceUrl(
  sourceUrl: string | null | undefined,
): IndustryHandbookId | null {
  if (!sourceUrl?.startsWith("handbook:")) return null;
  const id = sourceUrl.slice("handbook:".length);
  return isIndustryHandbookId(id) ? id : null;
}

/**
 * Reset handbook-derived Employee Handbook fields when switching to custom/other.
 * Preserves user-authored composePersona, quickAnswers, and business facts.
 */
export function resetHandbookDerivedProfile(
  businessName: string,
  current: BusinessEmployeeProfile,
): BusinessEmployeeProfile {
  const defaults = base(businessName);
  return {
    ...current,
    escalation: { ...defaults.escalation },
    acknowledgments: { ...defaults.acknowledgments },
    greetingVariants: {
      firstContact: [...defaults.greetingVariants.firstContact],
      returning: [...defaults.greetingVariants.returning],
    },
    courtesyTemplates: {
      thanks: [...defaults.courtesyTemplates.thanks],
      checking: defaults.courtesyTemplates.checking,
    },
  };
}

const HANDBOOK_ESCALATION_CONTACTS = new Set(
  Object.keys({
    "clinic reception": "clinic",
    "admissions counsellor": "coaching",
    "design coordinator": "interior_design",
    "sales executive": "real_estate",
    "restaurant manager": "restaurant",
    "front desk": "salon",
  } satisfies Record<string, IndustryHandbookId>),
);

/** True when Employee Handbook fields still carry a prior vertical template. */
export function profileHasHandbookPollution(profile: BusinessEmployeeProfile): boolean {
  const thanksText = (profile.courtesyTemplates?.thanks ?? []).join(" ");
  if (/doctor|patient|appointments or reports|medical advice/i.test(thanksText)) {
    return true;
  }
  const sensitive = profile.acknowledgments?.sensitive_topic ?? "";
  if (/medical advice|reception team will get back/i.test(sensitive)) {
    return true;
  }
  const contact = profile.escalation?.contactName?.trim().toLowerCase();
  return Boolean(contact && HANDBOOK_ESCALATION_CONTACTS.has(contact));
}
