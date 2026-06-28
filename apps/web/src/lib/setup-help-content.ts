import { GROWVISI_WHATSAPP_ONBOARDING_HELP_MAILTO } from "@growvisi/shared";

export type HelpFabContext = "onboarding" | "connection" | "general";

export type SetupHelpItem = {
  id: string;
  question: string;
  answer: string;
};

const FAQ_CONTEXT_IDS: Record<HelpFabContext, readonly string[]> = {
  onboarding: ["which-option", "facebook-vs-token", "test-message", "skip"],
  connection: ["token-expiry", "no-number", "which-option", "facebook-vs-token"],
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
  emailHref: "mailto:support@growvisi.in",
} as const;

export function helpFabContextForPath(pathname: string): HelpFabContext | null {
  if (pathname.startsWith("/onboarding")) return "onboarding";
  if (pathname.startsWith("/dashboard/connection")) return "connection";
  return null;
}
