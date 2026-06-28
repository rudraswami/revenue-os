"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Headphones, Mail, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/locale-provider";
import {
  helpFabContextForPath,
  SETUP_HELP_ESCALATION,
  setupHelpForContext,
  type HelpFabContext,
} from "@/lib/setup-help-content";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const AUTO_COLLAPSE_MS = 20_000;

/**
 * Contextual setup help FAB — not customer WhatsApp chat.
 * v1: curated FAQs + human escalation (call / email).
 */
export function GrowvisiHelpFab({ context: contextOverride }: { context?: HelpFabContext }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const inferred = helpFabContextForPath(pathname ?? "");
  const context = contextOverride ?? inferred;
  const [open, setOpen] = useState(false);
  const pinnedRef = useRef(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCollapse = useCallback(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    if (pinnedRef.current) return;
    collapseTimer.current = setTimeout(() => setOpen(false), AUTO_COLLAPSE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, []);

  if (!context) return null;

  const items = setupHelpForContext(context, t);
  const title =
    context === "onboarding"
      ? t("setupHelp.onboardingTitle")
      : context === "connection"
        ? t("setupHelp.connectionTitle")
        : t("setupHelp.generalTitle");

  function toggle() {
    const next = !open;
    setOpen(next);
    pinnedRef.current = next;
    if (next) scheduleCollapse();
    else if (collapseTimer.current) clearTimeout(collapseTimer.current);
  }

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-40 flex flex-col items-start gap-2 sm:bottom-6 sm:left-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto w-[min(100vw-2.5rem,360px)] overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_60px_rgb(0_108_73/0.18)]"
            onMouseEnter={() => {
              if (collapseTimer.current) clearTimeout(collapseTimer.current);
            }}
            onMouseLeave={() => {
              if (open && !pinnedRef.current) scheduleCollapse();
            }}
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
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  pinnedRef.current = false;
                }}
                aria-label={t("setupHelp.closeHelp")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[min(52vh,340px)] overflow-y-auto custom-scrollbar">
              <div className="divide-y divide-border/60">
                {items.map((item) => (
                  <details key={item.id} className="group px-4 py-3">
                    <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                      {item.question}
                    </summary>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-border/80 bg-[#f8fafc] p-3">
              <Button asChild size="sm" className="h-9 w-full gap-2 rounded-xl">
                <a href={SETUP_HELP_ESCALATION.bookCallHref}>
                  <Headphones className="h-3.5 w-3.5" />
                  {t("setupHelp.bookCall")}
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-9 w-full gap-2 rounded-xl bg-white">
                <a href={SETUP_HELP_ESCALATION.emailHref}>
                  <Mail className="h-3.5 w-3.5" />
                  {t("setupHelp.emailSupport")}
                </a>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={toggle}
        className={cn(
          "pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_32px_rgb(0_108_73/0.45)] transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          open && "ring-2 ring-accent/30 ring-offset-2",
        )}
        whileTap={{ scale: 0.94 }}
        aria-expanded={open}
        aria-label={open ? t("setupHelp.closeHelp") : t("setupHelp.openHelp")}
      >
        <MessageCircle className="h-5 w-5" strokeWidth={2} />
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
