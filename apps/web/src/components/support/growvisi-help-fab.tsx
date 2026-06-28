"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Headphones, Mail, MessageCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetupHelpChat } from "@/components/support/setup-help-chat";
import { SetupHelpFaqList } from "@/components/support/setup-help-faq-list";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n/locale-provider";
import {
  helpFabContextForPath,
  SETUP_HELP_ESCALATION,
  setupHelpForContext,
  type HelpFabContext,
} from "@/lib/setup-help-content";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

type HelpTab = "answers" | "ask";

/**
 * AI Support FAB — merchant onboarding help only (not customer WhatsApp chat).
 */
export function GrowvisiHelpFab({ context: contextOverride }: { context?: HelpFabContext }) {
  const { t } = useI18n();
  const token = useAuthStore((s) => s.accessToken);
  const pathname = usePathname();
  const inferred = helpFabContextForPath(pathname ?? "");
  const context = contextOverride ?? inferred;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<HelpTab>("answers");
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: capabilities } = useQuery({
    queryKey: ["support-capabilities"],
    queryFn: () => apiFetch<{ setupHelpLlm: boolean }>("/support/capabilities", {
      token: token ?? undefined,
    }),
    enabled: !!token && !!context,
    staleTime: 120_000,
    retry: 1,
  });

  const llmAvailable = capabilities?.setupHelpLlm === true;

  useEffect(() => {
    if (open) setTab("answers");
  }, [open]);

  if (!context) return null;

  const items = setupHelpForContext(context, t);
  const title =
    context === "onboarding"
      ? t("setupHelp.onboardingTitle")
      : context === "connection"
        ? t("setupHelp.connectionTitle")
        : t("setupHelp.generalTitle");

  function closePanel() {
    setOpen(false);
  }

  return (
    <div className="fixed bottom-5 left-5 z-[60] flex flex-col items-start gap-2 sm:bottom-6 sm:left-6">
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="w-[min(100vw-2.5rem,380px)] overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_60px_rgb(0_108_73/0.18)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border/80 bg-gradient-to-r from-[#ecfdf5] to-white px-4 py-3.5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                  {t("setupHelp.eyebrow")}
                </p>
                <p className="text-sm font-bold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("setupHelp.subtitle")}</p>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                onClick={closePanel}
                aria-label={t("setupHelp.closeHelp")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {llmAvailable && (
              <div className="flex border-b border-border/60 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "answers"}
                  onClick={() => setTab("answers")}
                  className={cn(
                    "min-h-10 flex-1 touch-manipulation rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    tab === "answers"
                      ? "bg-accent text-white"
                      : "text-muted-foreground hover:bg-[#ecfdf5]/80",
                  )}
                >
                  {t("setupHelp.tabAnswers")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "ask"}
                  onClick={() => setTab("ask")}
                  className={cn(
                    "flex min-h-10 flex-1 touch-manipulation items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    tab === "ask"
                      ? "bg-accent text-white"
                      : "text-muted-foreground hover:bg-[#ecfdf5]/80",
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  {t("setupHelp.tabAsk")}
                </button>
              </div>
            )}

            {tab === "answers" || !llmAvailable ? (
              <div className="max-h-[min(52vh,340px)] overflow-y-auto overscroll-contain custom-scrollbar">
                <SetupHelpFaqList items={items} />
              </div>
            ) : (
              context && <SetupHelpChat context={context} />
            )}

            <div className="space-y-2 border-t border-border/80 bg-[#f8fafc] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
                {t("setupHelp.supportNeedTitle")}
              </p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t("setupHelp.supportHours")}
              </p>
              <p className="text-xs text-foreground">
                <span className="font-medium text-muted-foreground">
                  {t("setupHelp.supportEmailLabel")}:{" "}
                </span>
                <a
                  href={SETUP_HELP_ESCALATION.emailHref}
                  className="font-semibold text-accent hover:underline"
                >
                  {SETUP_HELP_ESCALATION.supportEmail}
                </a>
              </p>
              <Button asChild size="sm" className="h-10 w-full gap-2 rounded-xl">
                <a href={SETUP_HELP_ESCALATION.bookCallHref}>
                  <Headphones className="h-3.5 w-3.5" />
                  {t("setupHelp.bookCall")}
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-10 w-full gap-2 rounded-xl bg-white">
                <a href={SETUP_HELP_ESCALATION.contactFormHref}>
                  <Mail className="h-3.5 w-3.5" />
                  {t("setupHelp.contactForm")}
                </a>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-14 w-14 touch-manipulation items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_32px_rgb(0_108_73/0.45)] transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          open && "ring-2 ring-accent/30 ring-offset-2",
        )}
        whileTap={{ scale: 0.94 }}
        aria-expanded={open}
        aria-label={open ? t("setupHelp.closeHelp") : t("setupHelp.openHelp")}
      >
        <MessageCircle className="h-5 w-5" strokeWidth={2} />
        {llmAvailable && !open && (
          <Sparkles className="absolute right-3 top-3 h-3 w-3 text-[#6cf8bb]" aria-hidden />
        )}
        <ChevronDown
          className={cn(
            "absolute bottom-1.5 h-3 w-3 opacity-80 transition-transform",
            open && "rotate-180",
          )}
        />
      </motion.button>
    </div>
  );
}
