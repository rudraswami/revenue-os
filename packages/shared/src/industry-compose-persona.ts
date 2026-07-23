import type { BusinessComposePersonaOverride, BusinessEmployeeProfile } from "./intelligence";
import {
  CUSTOM_INDUSTRY_ID,
  getIndustryHandbook,
  isCustomIndustryId,
  isIndustryHandbookId,
  type IndustryComposePersona,
  type IndustryHandbookId,
} from "./industry-handbooks";

export type { IndustryComposePersona } from "./industry-handbooks";
export { CUSTOM_INDUSTRY_ID } from "./industry-handbooks";

export interface ResolveIndustryComposePersonaInput {
  /** Workspace industry id — handbook id or `custom`. */
  industryId?: string | null;
  /** Display label when industryId is `custom`. */
  customIndustryLabel?: string | null;
  businessName: string;
  profile: BusinessEmployeeProfile;
}

const DEFAULT_PERSONA: Omit<IndustryComposePersona, "identity"> & {
  identityTemplate: string;
} = {
  identityTemplate:
    "You are a helpful team member at {businessName} who handles customer conversations on WhatsApp. You are warm, knowledgeable, and genuinely interested in helping. You answer questions clearly using business knowledge, and guide customers naturally — like a friendly expert, not a corporate chatbot.",
  guardrails: [
    "Never invent prices, discounts, policies, or features that are not in the business knowledge.",
    "Never promise something the business has not confirmed in knowledge or profile.",
  ],
};

/** Default persona template for workspaces on the custom/other industry path. */
export const DEFAULT_CUSTOM_COMPOSE_PERSONA: IndustryComposePersona = {
  identity:
    "You are a knowledgeable team member at {businessName} who helps customers on WhatsApp. You understand the business, answer questions clearly from available knowledge, and guide people naturally toward the right next step.",
  guardrails: [
    "Answer using business knowledge only — never invent products, prices, or policies.",
    "If a detail is not in knowledge, say you will confirm it rather than guessing.",
    "Keep replies short and conversational — this is WhatsApp, not email.",
    "Be helpful and human — avoid robotic corporate phrases.",
  ],
};

/** Maps escalation contact roles (from handbook profilePatch) to handbook ids. */
const ESCALATION_CONTACT_TO_INDUSTRY: Record<string, IndustryHandbookId> = {
  "clinic reception": "clinic",
  "admissions counsellor": "coaching",
  "design coordinator": "interior_design",
  "sales executive": "real_estate",
  "restaurant manager": "restaurant",
  "front desk": "salon",
};

function substituteBusinessName(text: string, businessName: string): string {
  const name = businessName.trim() || "this business";
  return text.replace(/\{businessName\}/gi, name);
}

function personaFromHandbook(handbookId: IndustryHandbookId, businessName: string): IndustryComposePersona {
  const handbook = getIndustryHandbook(handbookId);
  return {
    identity: substituteBusinessName(handbook.composePersona.identity, businessName),
    guardrails: [...handbook.composePersona.guardrails],
  };
}

function personaFromProfileOverride(
  override: BusinessComposePersonaOverride | undefined,
  businessName: string,
  fallbackGuardrails: string[],
): IndustryComposePersona | undefined {
  if (!override) return undefined;
  const identity = override.identity?.trim();
  if (!identity) return undefined;

  const guardrails =
    override.guardrails && override.guardrails.length > 0
      ? [...override.guardrails]
      : [...fallbackGuardrails];

  return {
    identity: substituteBusinessName(identity, businessName),
    guardrails,
  };
}

/**
 * Default persona for custom/other industries — includes optional sector label.
 */
export function getDefaultCustomComposePersona(
  businessName: string,
  customIndustryLabel?: string | null,
): IndustryComposePersona {
  const label = customIndustryLabel?.trim();
  const sectorHint = label
    ? ` This is a ${label} business — tailor your language to that sector.`
    : "";

  return {
    identity:
      substituteBusinessName(DEFAULT_CUSTOM_COMPOSE_PERSONA.identity, businessName) + sectorHint,
    guardrails: [...DEFAULT_CUSTOM_COMPOSE_PERSONA.guardrails],
  };
}

/**
 * Infer industry from profile fields when `industryId` was never saved
 * (legacy workspaces that applied a handbook before industryId was persisted).
 */
export function inferIndustryIdFromProfile(
  profile: BusinessEmployeeProfile,
): IndustryHandbookId | undefined {
  const contact = profile.escalation?.contactName?.trim().toLowerCase();
  if (!contact) return undefined;
  return ESCALATION_CONTACT_TO_INDUSTRY[contact];
}

/**
 * Resolve the compose persona for a workspace.
 *
 * Priority:
 * 1. User-defined `profile.composePersona` override (any industry)
 * 2. Predefined handbook from `industryId`
 * 3. Custom industry defaults (`industryId === custom`)
 * 4. Legacy profile inference → handbook
 * 5. Generic default
 */
export function resolveIndustryComposePersona(
  input: ResolveIndustryComposePersonaInput,
): IndustryComposePersona {
  const businessName = input.businessName.trim() || "this business";

  const handbookId =
    input.industryId && isIndustryHandbookId(input.industryId)
      ? input.industryId
      : isCustomIndustryId(input.industryId ?? "")
        ? undefined
        : inferIndustryIdFromProfile(input.profile);

  const handbookPersona = handbookId
    ? personaFromHandbook(handbookId, businessName)
    : isCustomIndustryId(input.industryId ?? "")
      ? getDefaultCustomComposePersona(businessName, input.customIndustryLabel)
      : {
          identity: substituteBusinessName(DEFAULT_PERSONA.identityTemplate, businessName),
          guardrails: [...DEFAULT_PERSONA.guardrails],
        };

  const override = personaFromProfileOverride(
    input.profile.composePersona,
    businessName,
    handbookPersona.guardrails,
  );
  if (override) return override;

  if (isCustomIndustryId(input.industryId ?? "")) {
    return getDefaultCustomComposePersona(businessName, input.customIndustryLabel);
  }

  if (handbookId) return handbookPersona;

  return {
    identity: substituteBusinessName(DEFAULT_PERSONA.identityTemplate, businessName),
    guardrails: [...DEFAULT_PERSONA.guardrails],
  };
}

/**
 * Preview persona for the settings UI — shows what the user would get if they
 * saved the draft override (or handbook default when override is empty).
 */
export function previewIndustryComposePersona(
  input: ResolveIndustryComposePersonaInput & {
    draftOverride?: BusinessComposePersonaOverride | null;
  },
): IndustryComposePersona {
  const profile =
    input.draftOverride &&
    (input.draftOverride.identity?.trim() || (input.draftOverride.guardrails?.length ?? 0) > 0)
      ? {
          ...input.profile,
          composePersona: input.draftOverride,
        }
      : input.profile;

  return resolveIndustryComposePersona({ ...input, profile });
}

/**
 * Format persona + guardrails for injection into the compose system prompt.
 */
export function formatIndustryComposePersonaBlock(persona: IndustryComposePersona): string {
  const guardrailLines =
    persona.guardrails.length > 0
      ? [
          "## Industry guardrails (non-negotiable)",
          ...persona.guardrails.map((g) => `- ${g}`),
        ].join("\n")
      : "";

  return [persona.identity, guardrailLines].filter(Boolean).join("\n\n");
}
