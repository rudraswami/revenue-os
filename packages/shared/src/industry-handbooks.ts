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

export type IndustryHandbookId = (typeof INDUSTRY_HANDBOOK_IDS)[number];

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
