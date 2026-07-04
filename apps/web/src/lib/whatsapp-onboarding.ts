/** Digits-only for wa.me links (E.164 without +). */
export function whatsappDigits(displayPhone: string) {
  return displayPhone.replace(/\D/g, "");
}

export function whatsappChatUrl(displayPhone: string) {
  const digits = whatsappDigits(displayPhone);
  return digits ? `https://wa.me/${digits}` : null;
}

export function looksLikeMetaToken(value: string) {
  const t = value.trim();
  return t.startsWith("EAA") && t.length >= 40;
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
