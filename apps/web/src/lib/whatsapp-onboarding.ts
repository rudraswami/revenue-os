/** Digits-only for wa.me links (E.164 without +). */
export function whatsappDigits(displayPhone: string) {
  return displayPhone.replace(/\D/g, "");
}

export function whatsappChatUrl(displayPhone: string) {
  const digits = whatsappDigits(displayPhone);
  return digits ? `https://wa.me/${digits}` : null;
}

/** Strip quotes, whitespace, and common copy-paste wrappers from a Meta Graph API token. */
export function normalizeMetaToken(value: string): string {
  let t = value.trim();
  if (!t) return "";

  // Unwrap one layer of quotes from JSON / form copy.
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }

  // access_token=EAA… or "access_token": "EAA…"
  const embedded = t.match(/EAA[A-Za-z0-9+/=_-]{15,}/);
  if (embedded) return embedded[0];

  // Collapse accidental line breaks / spaces inside the token string.
  if (/^EAA/i.test(t.replace(/\s+/g, ""))) {
    return t.replace(/\s+/g, "");
  }

  return t;
}

export function looksLikeMetaToken(value: string) {
  const t = normalizeMetaToken(value);
  // Meta user / system tokens from API Setup start with EAA and are typically 100+ chars.
  return /^EAA[A-Za-z0-9+/=_-]{15,}$/.test(t);
}

export const WIZARD_STEP_KEY = "growvisi-wa-wizard-step";
/** Draft Meta token — survives tab switches / remounts while user is pasting. */
export const WIZARD_TOKEN_DRAFT_KEY = "growvisi-wa-token-draft";

export type WizardStepId = "connect" | "verify";

export const WIZARD_STEPS: Array<{ id: WizardStepId; title: string }> = [
  { id: "connect", title: "Paste token" },
  { id: "verify", title: "Test message" },
];

export interface DiscoveredPhone {
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  businessName?: string | null;
}

export interface WhatsappAccountSummary {
  id: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
}
