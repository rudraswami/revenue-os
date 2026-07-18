import { GROWVISI_EMAIL_SUPPORT } from "@growvisi/shared";
import { MARKETING_SUPPORT } from "@/lib/brand-copy";
import { whatsappChatUrl } from "@/lib/whatsapp-onboarding";

/** Public Growvisi sales line (IN). Override with NEXT_PUBLIC_GROWVISI_SALES_WHATSAPP on Vercel. */
export const GROWVISI_SALES_WHATSAPP_DEFAULT = "918660838896";

/** Normalize 10-digit Indian mobile or full E.164 digits. */
export function normalizeSalesWhatsAppDigits(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.startsWith("0") && digits.length === 11) digits = `91${digits.slice(1)}`;
  return digits.length >= 11 ? digits : null;
}

/** E.164 digits — env or default sales line */
export function getSalesWhatsAppDigits(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_GROWVISI_SALES_WHATSAPP?.trim() || GROWVISI_SALES_WHATSAPP_DEFAULT;
  return normalizeSalesWhatsAppDigits(raw);
}

export function getSalesWhatsAppUrl(message?: string): string | null {
  const digits = getSalesWhatsAppDigits();
  if (!digits) return null;
  const text = message ?? MARKETING_SUPPORT.defaultWhatsAppMessage;
  return `${whatsappChatUrl(digits)}?text=${encodeURIComponent(text)}`;
}

export function formatSalesWhatsAppDisplay(): string | null {
  const digits = getSalesWhatsAppDigits();
  if (!digits) return null;
  if (digits.startsWith("91") && digits.length === 12) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return `+${digits}`;
}

export type InquiryKind = "sales" | "enterprise";

export function buildInquiryWhatsAppMessage(details: {
  kind: InquiryKind;
  name: string;
  company: string;
  phone: string;
  team?: string;
  message?: string;
}): string {
  const header =
    details.kind === "enterprise"
      ? "Hi Growvisi — Enterprise / agency inquiry"
      : "Hi Growvisi — Demo / sales inquiry";

  return [
    header,
    `Name: ${details.name.trim()}`,
    `Company: ${details.company.trim()}`,
    `My WhatsApp: ${details.phone.trim()}`,
    details.team?.trim() ? `Scale: ${details.team.trim()}` : null,
    details.message?.trim() ? `Note: ${details.message.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function hasSalesWhatsApp(): boolean {
  return !!getSalesWhatsAppDigits();
}

export const MARKETING_SUPPORT_EMAIL = GROWVISI_EMAIL_SUPPORT;
