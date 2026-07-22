import type { BusinessEmployeeProfile, BusinessLanguage } from "./intelligence";

const DEVANAGARI = /[\u0900-\u097F]/;
const LATIN = /[a-zA-Z]/;
const ROMANIZED_HINDI =
  /\b(kya|hai|aapka|aap|ka|ki|ke|nahi|krna|bhai|ji|namaste|dhanyavaad|shukriya)\b/i;
const DISCOUNT_NEGOTIATION =
  /discount|%\s*off|better\s+price|last\s+price|reduce\s+the\s+price|kam\s+kar|discount\s+do/i;

/** Infer customer language from the latest message (lightweight heuristic). */
export function inferCustomerLanguage(
  text: string | null | undefined,
): BusinessLanguage | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  const hasDevanagari = DEVANAGARI.test(t);
  const hasLatin = LATIN.test(t);
  const romanizedHindi = ROMANIZED_HINDI.test(t);
  if (hasDevanagari && hasLatin) return "hinglish";
  if (hasDevanagari) return "hi";
  if (romanizedHindi && hasLatin) return "hinglish";
  if (hasLatin) return "en";
  return null;
}

const LANGUAGE_LABELS: Record<BusinessLanguage, string> = {
  en: "English",
  hi: "Hindi",
  hinglish: "Hinglish",
};

/** Compose instruction for reply language. */
export function resolveComposeLanguageInstruction(
  profile: BusinessEmployeeProfile,
  lastInbound?: string | null,
): string {
  const inferred = inferCustomerLanguage(lastInbound);
  if (profile.language.mirrorCustomer && inferred) {
    return `Reply in ${LANGUAGE_LABELS[inferred]} to mirror the customer.`;
  }
  return `Default language: ${LANGUAGE_LABELS[profile.language.default]}.`;
}

/** Voice + emoji instructions for the compose system prompt. */
export function buildVoiceInstructions(profile: BusinessEmployeeProfile): string[] {
  const lines: string[] = [];
  if (profile.voice.register === "professional") {
    lines.push(
      "Tone: warm and professional. Sound like a real person who is knowledgeable and helpful — not corporate or stiff. Imagine you're a trusted advisor texting a client.",
    );
  } else {
    lines.push(
      "Tone: friendly and conversational. Sound like a real person texting — like a helpful shop owner who genuinely cares about helping the customer. Keep it natural.",
    );
  }
  if (profile.voice.emoji === "none") {
    lines.push("Do not use emojis.");
  } else {
    lines.push("You may use 1 emoji per message if it feels natural — never force them.");
  }
  if (profile.voice.signOff?.trim()) {
    lines.push(`If the reply is a detailed answer (4+ lines), you may end with: ${profile.voice.signOff.trim()}. For short quick replies, skip the sign-off.`);
  }
  return lines;
}

/** First name for greetings when enabled. */
export function formatContactName(
  profile: BusinessEmployeeProfile,
  contactName: string,
): string {
  if (!profile.voice.useFirstName) return "there";
  const first = contactName.trim().split(/\s+/)[0];
  if (!first || first.toLowerCase() === "there") return contactName || "there";
  return first;
}

/** Close-action hints when the customer may be ready to buy or asking price. */
export function buildCloseActionsBlock(
  profile: BusinessEmployeeProfile,
  intentKind: string,
): string | undefined {
  if (intentKind !== "ready_to_buy" && intentKind !== "pricing") return undefined;
  const parts: string[] = [];
  if (profile.closeActions.paymentLink) {
    parts.push(`Payment link: ${profile.closeActions.paymentLink}`);
  }
  if (profile.closeActions.bookingUrl) {
    parts.push(`Booking URL: ${profile.closeActions.bookingUrl}`);
  }
  if (profile.closeActions.callNumber) {
    parts.push(`Call: ${profile.closeActions.callNumber}`);
  }
  if (!parts.length) return undefined;
  return `Approved close actions (use only when relevant — never invent others):\n${parts.join("\n")}`;
}

/** Customer-facing ack when policy blocks a full auto-reply. */
export function resolveProfileAcknowledgment(
  profile: BusinessEmployeeProfile,
  blockerCodes: string[],
): string | undefined {
  const priority = ["sensitive_topic", "needs_human", "knowledge_gap"];
  for (const code of priority) {
    if (!blockerCodes.includes(code)) continue;
    const msg = profile.acknowledgments[code];
    if (msg?.trim()) return msg.trim();
  }
  for (const code of blockerCodes) {
    if (priority.includes(code)) continue;
    const msg = profile.acknowledgments[code];
    if (msg?.trim()) return msg.trim();
  }
  return undefined;
}

/** Whether the customer is negotiating a discount (policy uses discountAuthority). */
export function isDiscountNegotiationMessage(text: string | null | undefined): boolean {
  return DISCOUNT_NEGOTIATION.test((text ?? "").trim());
}
