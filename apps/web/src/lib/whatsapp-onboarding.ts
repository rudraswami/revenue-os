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

export type WizardStepId = "prepare" | "connect" | "verify";

export const WIZARD_STEPS: Array<{ id: WizardStepId; title: string }> = [
  { id: "prepare", title: "Overview" },
  { id: "connect", title: "Paste token" },
  { id: "verify", title: "Test" },
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
