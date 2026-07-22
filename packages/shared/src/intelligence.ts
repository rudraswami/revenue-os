import type { AiClassificationResult } from "./types";
import type { KnowledgeHealthSummary } from "./knowledge-retrieval";
import type { AutonomyMetricsSnapshot } from "./autonomy-metrics";
import type { WorkingMemory } from "./working-memory";

export const KNOWLEDGE_CATEGORIES = [
  "general",
  "pricing",
  "policy",
  "faq",
  "product",
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

/** Max characters stored per knowledge document (paste or extracted from upload). */
export const KNOWLEDGE_MAX_CONTENT_CHARS = 20_000;

/** Max upload size for PDF/DOCX/TXT business knowledge files. */
export const KNOWLEDGE_MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const KNOWLEDGE_UPLOAD_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

export const ACTION_TYPES = [
  "lead.update_score",
  "lead.update_stage",
  "conversation.set_handoff",
  "conversation.assign",
  "task.create",
  "email.send",
  "reply.draft",
  "reply.send",
  "webhook.emit",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export type ActionStatus = "pending" | "done" | "skipped" | "failed";
export type ActionPlanStatus = "proposed" | "executing" | "completed" | "failed";

export interface KnowledgeHit {
  chunkId: string;
  documentId: string;
  title: string;
  content: string;
  similarity: number;
  category: string;
  citation: string;
}

export interface ProposedAction {
  type: ActionType;
  executor: "growvisi" | "human" | "automation";
  payload: Record<string, unknown>;
  aiRunId?: string;
}

export interface ActionPlanView {
  id: string;
  status: ActionPlanStatus;
  confidence: number | null;
  classification: AiClassificationResult | null;
  actions: Array<{
    id: string;
    type: string;
    status: string;
    payload: Record<string, unknown>;
    result: Record<string, unknown> | null;
  }>;
  createdAt: string;
}

export interface ConversationIntelligenceView {
  actionPlan: ActionPlanView | null;
  observedMemory: Array<{
    id: string;
    type: string;
    content: string;
    source: string;
    createdAt: string;
  }>;
  knowledgeGaps: string[];
  replyDecision?: ReplyDecision | null;
  /** Latest structured needs from classification (Inbox chips). */
  customerNeeds?: string[];
  /** Phase 3 — engagement + customer card snapshot. */
  workingMemory?: WorkingMemory;
  kbHealth?: KnowledgeHealthSummary;
  autonomyMetrics?: AutonomyMetricsSnapshot;
}

/** Workspace default for how Growvisi handles customer replies. */
export const REPLY_AUTONOMY_MODES = ["intel_only", "assist", "auto_guarded"] as const;
export type ReplyAutonomyMode = (typeof REPLY_AUTONOMY_MODES)[number];

export const REPLY_EXECUTION_MODES = ["skip", "draft", "send"] as const;
export type ReplyExecutionMode = (typeof REPLY_EXECUTION_MODES)[number];

export type ReplyRiskLevel = "low" | "medium" | "high";

/** AI reply pipeline routing — fast template, standard LLM, complex draft, human handoff. */
export type ExecutionPath = "fast" | "standard" | "complex" | "human";

export interface ReplyDecision {
  mode: ReplyExecutionMode;
  /** 0–1 composite confidence for this decision */
  confidence: number;
  risk: ReplyRiskLevel;
  /** Human-readable reasons shown in Inbox */
  reasons: string[];
  /** When mode is skip — primary blocker codes */
  blockers?: string[];
  evaluatedAt: string;
  /** Phase 2: would auto-send if workspace allowed */
  autoEligible?: boolean;
  /** Holding message sent when policy blocks a full auto-reply (Employee Handbook ack). */
  acknowledgmentText?: string;
}

/** How aggressively Growvisi may auto-send on WhatsApp (auto_guarded only). */
export const AUTOMATION_POLICY_PRESETS = ["careful", "balanced", "responsive"] as const;
export type AutomationPolicyPreset = (typeof AUTOMATION_POLICY_PRESETS)[number];

export interface AutomationPolicyRules {
  /** Auto-send greetings, thanks, and acks (fast path). */
  autoSendGreetings: boolean;
  /** Auto-send when Business Knowledge match is strong enough. */
  autoSendFaqWhenGrounded: boolean;
  /** Auto-send pricing answers when grounded (false = draft for review). */
  autoSendPricingWhenGrounded: boolean;
  /** Minimum classify confidence to allow auto-send. */
  minClassifyConfidence: number;
  /** Minimum RAG similarity (0–1) to treat as grounded. */
  minGroundingSimilarity: number;
  /** Pipeline stages that always draft instead of auto-send. */
  humanForStages: string[];
}

export interface AutomationSafetySettings {
  /** Max AI sends per thread within the velocity window (loop protection). */
  maxSendsPerVelocityWindow: number;
  /** Velocity window length in minutes. */
  velocityWindowMinutes: number;
}

export interface IntelligenceWorkspaceSettings {
  /** Workspace default for reply behavior. */
  replyAutonomy: ReplyAutonomyMode;
  /** Preset for auto_guarded — careful / balanced / responsive. */
  automationPreset: AutomationPolicyPreset;
  /** Applied industry employee handbook (optional). */
  industryId?: string;
  /** Optional overrides; merged on top of preset defaults server-side. */
  automationRules?: Partial<AutomationPolicyRules>;
  safety?: Partial<AutomationSafetySettings>;
  /** How Growvisi represents this business — voice, escalation, close actions. */
  businessProfile?: BusinessEmployeeProfile;
}

/** PATCH body for intelligence settings — nested businessProfile fields are partial. */
export type BusinessEmployeeProfilePatch = {
  profileVersion?: number;
  voice?: Partial<BusinessVoiceProfile>;
  language?: Partial<BusinessLanguageProfile>;
  escalation?: Partial<BusinessEscalationProfile>;
  closeActions?: Partial<BusinessCloseActions>;
  discountAuthority?: Partial<BusinessDiscountAuthority>;
  acknowledgments?: Partial<Record<string, string>>;
  greetingVariants?: Partial<BusinessGreetingVariants>;
  courtesyTemplates?: Partial<BusinessCourtesyTemplates>;
};

export type IntelligenceWorkspaceSettingsPatch = Partial<
  Omit<IntelligenceWorkspaceSettings, "businessProfile">
> & {
  businessProfile?: BusinessEmployeeProfilePatch;
};

export const AUTOMATION_PRESET_DEFAULTS: Record<
  AutomationPolicyPreset,
  AutomationPolicyRules
> = {
  careful: {
    autoSendGreetings: true,
    autoSendFaqWhenGrounded: false,
    autoSendPricingWhenGrounded: false,
    minClassifyConfidence: 0.6,
    minGroundingSimilarity: 0.75,
    humanForStages: ["NEGOTIATION", "PROPOSAL"],
  },
  balanced: {
    autoSendGreetings: true,
    autoSendFaqWhenGrounded: true,
    // Grounded pricing can auto-send — the answerability gate still requires a
    // strong match (score >= 0.68 and top similarity >= 0.7), so weak pricing
    // matches keep going to draft for human review.
    autoSendPricingWhenGrounded: true,
    minClassifyConfidence: 0.55,
    minGroundingSimilarity: 0.7,
    humanForStages: ["NEGOTIATION", "PROPOSAL"],
  },
  responsive: {
    autoSendGreetings: true,
    autoSendFaqWhenGrounded: true,
    autoSendPricingWhenGrounded: true,
    minClassifyConfidence: 0.5,
    minGroundingSimilarity: 0.65,
    humanForStages: ["PROPOSAL"],
  },
};

export const DEFAULT_AUTOMATION_SAFETY: AutomationSafetySettings = {
  maxSendsPerVelocityWindow: 3,
  velocityWindowMinutes: 2,
};

/** How Growvisi speaks and operates on behalf of the business (Employee Handbook). */
export const BUSINESS_VOICE_REGISTERS = ["casual", "professional"] as const;
export type BusinessVoiceRegister = (typeof BUSINESS_VOICE_REGISTERS)[number];

export const BUSINESS_EMOJI_POLICIES = ["none", "sparingly"] as const;
export type BusinessEmojiPolicy = (typeof BUSINESS_EMOJI_POLICIES)[number];

export const BUSINESS_LANGUAGES = ["en", "hi", "hinglish"] as const;
export type BusinessLanguage = (typeof BUSINESS_LANGUAGES)[number];

export const DISCOUNT_AUTHORITY_MODES = ["none", "preset_max"] as const;
export type DiscountAuthorityMode = (typeof DISCOUNT_AUTHORITY_MODES)[number];

export interface BusinessVoiceProfile {
  register: BusinessVoiceRegister;
  useFirstName: boolean;
  emoji: BusinessEmojiPolicy;
  signOff?: string;
}

export interface BusinessLanguageProfile {
  default: BusinessLanguage;
  mirrorCustomer: boolean;
}

export interface BusinessEscalationProfile {
  contactName: string;
  contactPhone?: string;
  slaMinutes: number;
}

export interface BusinessCloseActions {
  paymentLink?: string;
  bookingUrl?: string;
  callNumber?: string;
}

export interface BusinessDiscountAuthority {
  mode: DiscountAuthorityMode;
  maxPercent?: number;
}

export interface BusinessGreetingVariants {
  firstContact: string[];
  returning: string[];
}

export interface BusinessCourtesyTemplates {
  thanks: string[];
  checking: string;
}

/** Per-workspace operational profile for the AI employee. Stored in org.settings.intelligence.businessProfile */
export interface BusinessEmployeeProfile {
  profileVersion: number;
  voice: BusinessVoiceProfile;
  language: BusinessLanguageProfile;
  escalation: BusinessEscalationProfile;
  closeActions: BusinessCloseActions;
  discountAuthority: BusinessDiscountAuthority;
  /** Policy blocker code → short customer-facing ack message */
  acknowledgments: Record<string, string>;
  greetingVariants: BusinessGreetingVariants;
  courtesyTemplates: BusinessCourtesyTemplates;
}

const MAX_STRING = 500;
const MAX_TEMPLATE_ITEMS = 8;
const MAX_ACK_CODES = 20;

function trimString(value: unknown, max = MAX_STRING): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function stringArray(value: unknown, maxItems = MAX_TEMPLATE_ITEMS): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => typeof v === "string" && v.trim().length > 0)
    .map((v) => String(v).trim().slice(0, MAX_STRING))
    .slice(0, maxItems);
}

function substituteBusinessName(text: string, businessName: string): string {
  return text.replace(/\{businessName\}/gi, businessName);
}

export function defaultBusinessEmployeeProfile(businessName: string): BusinessEmployeeProfile {
  const biz = businessName.trim() || "us";
  return {
    profileVersion: 1,
    voice: {
      register: "casual",
      useFirstName: true,
      emoji: "sparingly",
      signOff: `— Team ${biz}`,
    },
    language: {
      default: "hinglish",
      mirrorCustomer: true,
    },
    escalation: {
      contactName: "our team",
      slaMinutes: 120,
    },
    closeActions: {},
    discountAuthority: {
      mode: "none",
    },
    acknowledgments: {
      sensitive_topic: `Thanks for reaching out. Someone from ${biz} will reply shortly.`,
      needs_human: `Got it — a teammate from ${biz} will get back to you soon.`,
      knowledge_gap: `Thanks for your question. We're checking the details and will reply shortly.`,
    },
    greetingVariants: {
      firstContact: [
        `Hi! Thanks for messaging ${biz}. What can we help you with today?`,
        `Hello! Welcome to ${biz} — how can we assist you?`,
      ],
      returning: [
        "Hi! How can we help you today?",
        "Hello! What would you like to know?",
      ],
    },
    courtesyTemplates: {
      thanks: [
        "You're welcome! Let us know if you need anything else.",
        "Happy to help! Reach out anytime.",
      ],
      checking: `Let me check with the team and get back to you shortly.`,
    },
  };
}

/** Normalize stored JSON into a complete BusinessEmployeeProfile. */
export function normalizeBusinessEmployeeProfile(
  raw: unknown,
  businessName: string,
): BusinessEmployeeProfile {
  const defaults = defaultBusinessEmployeeProfile(businessName);
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<BusinessEmployeeProfile>;

  const voiceIn: Partial<BusinessVoiceProfile> =
    input.voice && typeof input.voice === "object" ? input.voice : {};
  const languageIn: Partial<BusinessLanguageProfile> =
    input.language && typeof input.language === "object" ? input.language : {};
  const escalationIn: Partial<BusinessEscalationProfile> =
    input.escalation && typeof input.escalation === "object" ? input.escalation : {};
  const closeIn: Partial<BusinessCloseActions> =
    input.closeActions && typeof input.closeActions === "object" ? input.closeActions : {};
  const discountIn: Partial<BusinessDiscountAuthority> =
    input.discountAuthority && typeof input.discountAuthority === "object"
      ? input.discountAuthority
      : {};

  const acknowledgments: Record<string, string> = { ...defaults.acknowledgments };
  if (input.acknowledgments && typeof input.acknowledgments === "object") {
    for (const [code, msg] of Object.entries(input.acknowledgments)) {
      const clean = trimString(msg, 280);
      if (clean && Object.keys(acknowledgments).length < MAX_ACK_CODES) {
        acknowledgments[code.slice(0, 64)] = clean;
      }
    }
  }

  const firstContact = stringArray(input.greetingVariants?.firstContact);
  const returning = stringArray(input.greetingVariants?.returning);
  const thanks = stringArray(input.courtesyTemplates?.thanks);

  const discountMode = DISCOUNT_AUTHORITY_MODES.includes(
    discountIn.mode as DiscountAuthorityMode,
  )
    ? (discountIn.mode as DiscountAuthorityMode)
    : defaults.discountAuthority.mode;

  return {
    profileVersion:
      typeof input.profileVersion === "number" && input.profileVersion > 0
        ? Math.floor(input.profileVersion)
        : defaults.profileVersion,
    voice: {
      register: BUSINESS_VOICE_REGISTERS.includes(voiceIn.register as BusinessVoiceRegister)
        ? (voiceIn.register as BusinessVoiceRegister)
        : defaults.voice.register,
      useFirstName:
        typeof voiceIn.useFirstName === "boolean"
          ? voiceIn.useFirstName
          : defaults.voice.useFirstName,
      emoji: BUSINESS_EMOJI_POLICIES.includes(voiceIn.emoji as BusinessEmojiPolicy)
        ? (voiceIn.emoji as BusinessEmojiPolicy)
        : defaults.voice.emoji,
      signOff: trimString(voiceIn.signOff, 120) ?? defaults.voice.signOff,
    },
    language: {
      default: BUSINESS_LANGUAGES.includes(languageIn.default as BusinessLanguage)
        ? (languageIn.default as BusinessLanguage)
        : defaults.language.default,
      mirrorCustomer:
        typeof languageIn.mirrorCustomer === "boolean"
          ? languageIn.mirrorCustomer
          : defaults.language.mirrorCustomer,
    },
    escalation: {
      contactName:
        trimString(escalationIn.contactName, 80) ?? defaults.escalation.contactName,
      contactPhone: trimString(escalationIn.contactPhone, 20),
      slaMinutes:
        typeof escalationIn.slaMinutes === "number" &&
        escalationIn.slaMinutes >= 5 &&
        escalationIn.slaMinutes <= 1440
          ? Math.floor(escalationIn.slaMinutes)
          : defaults.escalation.slaMinutes,
    },
    closeActions: {
      paymentLink: trimString(closeIn.paymentLink, 300),
      bookingUrl: trimString(closeIn.bookingUrl, 300),
      callNumber: trimString(closeIn.callNumber, 20),
    },
    discountAuthority: {
      mode: discountMode,
      maxPercent:
        discountMode === "preset_max" &&
        typeof discountIn.maxPercent === "number" &&
        discountIn.maxPercent > 0 &&
        discountIn.maxPercent <= 50
          ? Math.floor(discountIn.maxPercent)
          : undefined,
    },
    acknowledgments,
    greetingVariants: {
      firstContact:
        firstContact.length > 0
          ? firstContact.map((t) => substituteBusinessName(t, businessName.trim() || "us"))
          : defaults.greetingVariants.firstContact,
      returning:
        returning.length > 0
          ? returning.map((t) => substituteBusinessName(t, businessName.trim() || "us"))
          : defaults.greetingVariants.returning,
    },
    courtesyTemplates: {
      thanks: thanks.length > 0 ? thanks : defaults.courtesyTemplates.thanks,
      checking:
        trimString(input.courtesyTemplates?.checking, 280) ??
        defaults.courtesyTemplates.checking,
    },
  };
}

export function resolveBusinessEmployeeProfile(
  stored: Partial<BusinessEmployeeProfile> | undefined,
  businessName: string,
): BusinessEmployeeProfile {
  return normalizeBusinessEmployeeProfile(stored ?? {}, businessName);
}

export const DEFAULT_INTELLIGENCE_SETTINGS: IntelligenceWorkspaceSettings = {
  // Draft-first by default (product non-negotiable: Growvisi never auto-replies
  // customers out of the box, and onboarding stays soft). The team reviews and
  // sends every reply from the Inbox. Auto-send (auto_guarded) is a deliberate
  // opt-in in Automations — and when enabled it now passes the coverage gate,
  // trust rails, grounding checks, and the Growth+ plan gate before sending.
  replyAutonomy: "assist",
  automationPreset: "balanced",
};
