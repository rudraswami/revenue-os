import {
  GROWVISI_EMAIL_SUPPORT,
  GROWVISI_WEB_URL,
  GROWVISI_WHATSAPP_ONBOARDING_HELP_MAILTO,
} from "@growvisi/shared";

export type HelpFabContext = "onboarding" | "connection" | "general";

export type SetupHelpItem = {
  id: string;
  question: string;
  answer: string;
};

const FAQ_CONTEXT_IDS: Record<HelpFabContext, readonly string[]> = {
  onboarding: ["which-option", "how-connect", "test-message", "skip"],
  connection: ["how-connect", "no-number", "which-option", "test-message"],
  general: ["growvisi-replies", "pricing"],
};

export function setupHelpForContext(
  context: HelpFabContext,
  t: (path: string) => string,
): SetupHelpItem[] {
  return FAQ_CONTEXT_IDS[context].map((id) => ({
    id,
    question: t(`setupHelp.faqs.${id}.q`),
    answer: t(`setupHelp.faqs.${id}.a`),
  }));
}

export const SETUP_HELP_ESCALATION = {
  bookCallHref: GROWVISI_WHATSAPP_ONBOARDING_HELP_MAILTO,
  emailHref: `mailto:${GROWVISI_EMAIL_SUPPORT}`,
  contactFormHref: `${GROWVISI_WEB_URL}/contact`,
  supportEmail: GROWVISI_EMAIL_SUPPORT,
} as const;

export function helpFabContextForPath(pathname: string): HelpFabContext | null {
  return resolveHelpContext(pathname, null);
}

export function resolveHelpContext(
  pathname: string,
  settingsTab: string | null,
): HelpFabContext | null {
  if (pathname.startsWith("/onboarding")) return "onboarding";
  if (pathname.startsWith("/dashboard/connection")) return "connection";
  if (pathname.startsWith("/dashboard/settings") && settingsTab === "whatsapp") {
    return "connection";
  }
  if (pathname.startsWith("/dashboard")) return "general";
  return null;
}
