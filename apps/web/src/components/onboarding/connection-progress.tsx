"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale-provider";

/**
 * One continuous journey — never swaps step lists when Meta Complete → saving
 * (that swap caused the “blink” between two option sets).
 */
const STEPS = ["waitingMeta", "secureLink", "savingNumber", "readyToScore"] as const;

type Phase = "waiting_meta" | "saving";

export function ConnectionProgress({ phase }: { phase: Phase }) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (phase === "waiting_meta") {
      setActiveIndex((i) => Math.min(i, 1));
      const t1 = window.setTimeout(() => setActiveIndex(1), 2400);
      return () => window.clearTimeout(t1);
    }

    // Meta Complete → keep the same list; advance into save steps smoothly.
    setActiveIndex((i) => Math.max(i, 2));
    const t2 = window.setTimeout(() => setActiveIndex(3), 1600);
    return () => window.clearTimeout(t2);
  }, [phase]);

  const progressPct = ((activeIndex + 1) / STEPS.length) * 100;

  return (
    <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_30px_rgb(11_28_48/0.06)]">
      <div className="h-1 w-full bg-muted">
        <motion.div
          className="h-full bg-accent"
          initial={false}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="px-6 py-9 sm:px-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.div
            key={phase}
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bento-mint text-whatsapp"
          >
            <Loader2 className="h-7 w-7 animate-spin" />
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28 }}
              className="space-y-2"
            >
              <h2 className="font-sans text-xl font-bold tracking-tight text-foreground">
                {phase === "waiting_meta"
                  ? t("onboardingActivation.progressTitleMeta")
                  : t("onboardingActivation.progressTitleSaving")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {phase === "waiting_meta"
                  ? t("onboardingActivation.progressMetaHint")
                  : t("onboardingActivation.progressSavingHint")}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <ul className="space-y-1">
          {STEPS.map((key, i) => {
            const done = i < activeIndex;
            const current = i === activeIndex;
            return (
              <motion.li
                key={key}
                layout
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-300",
                  current && "bg-bento-mint/80",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                    done && "bg-accent text-accent-foreground",
                    current && "bg-accent/15 text-accent",
                    !done && !current && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? (
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 22 }}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </motion.span>
                  ) : current ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-35" />
                  )}
                </span>
                <span
                  className={cn(
                    "font-medium transition-colors duration-300",
                    done || current ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t(`onboardingActivation.progressSteps.${key}`)}
                </span>
              </motion.li>
            );
          })}
        </ul>

        <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
          {t("onboardingActivation.progressEducation")}
        </p>
      </div>
    </div>
  );
}
