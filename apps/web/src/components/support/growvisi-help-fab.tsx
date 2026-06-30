"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MessageCircle } from "lucide-react";
import { SetupHelpPanel } from "@/components/support/setup-help-panel";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { HelpFabContext } from "@/lib/setup-help-content";
import { cn } from "@/lib/utils";

/**
 * AI Support FAB — merchant onboarding help only (not customer WhatsApp chat).
 * Shown alone after setup milestones are complete (see DashboardAssistLayer).
 */
export function GrowvisiHelpFab({ context }: { context: HelpFabContext }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[55] flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="pointer-events-auto w-[min(100vw-2.5rem,380px)] overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_60px_rgb(0_108_73/0.18)]"
          >
            <SetupHelpPanel context={context} onClose={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "pointer-events-auto relative flex h-14 w-14 touch-manipulation items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_32px_rgb(0_108_73/0.45)] transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
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
