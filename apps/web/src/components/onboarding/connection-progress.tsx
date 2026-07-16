"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale-provider";

/** Honest wait states — tied to Meta popup vs save, plus what Growvisi will do next. */
const WAITING_META_KEYS = ["waitingMeta", "secureLink"] as const;
const SAVING_KEYS = ["savingNumber", "readyToScore"] as const;

type Phase = "waiting_meta" | "saving";

export function ConnectionProgress({ phase }: { phase: Phase }) {
  const { t } = useI18n();
  const keys = phase === "waiting_meta" ? WAITING_META_KEYS : SAVING_KEYS;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
    if (phase === "waiting_meta") {
      const t1 = window.setTimeout(() => setActiveIndex(1), 2800);
      return () => window.clearTimeout(t1);
    }
    const t2 = window.setTimeout(() => setActiveIndex(1), 1200);
    return () => window.clearTimeout(t2);
  }, [phase]);

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-white px-6 py-10 shadow-[0_8px_30px_rgb(11_28_48/0.06)]">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#128C7E]">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[#0b1c30]">
          {phase === "waiting_meta"
            ? t("onboardingActivation.progressTitleMeta")
            : t("onboardingActivation.progressTitleSaving")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {phase === "waiting_meta"
            ? t("onboardingActivation.progressMetaHint")
            : t("onboardingActivation.progressSavingHint")}
        </p>
      </div>

      <ul className="space-y-3">
        {keys.map((key, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex;
          return (
            <motion.li
              key={key}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                current && "bg-[#ecfdf5]/80",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  done && "bg-[#128C7E] text-white",
                  current && "bg-accent/15 text-accent",
                  !done && !current && "bg-muted text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : current ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                )}
              </span>
              <span
                className={cn(
                  "font-medium",
                  done || current ? "text-[#0b1c30]" : "text-muted-foreground",
                )}
              >
                {t(`onboardingActivation.progressSteps.${key}`)}
              </span>
            </motion.li>
          );
        })}
      </ul>

      <p className="mt-8 rounded-xl bg-[#f8fafc] px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground">
        {t("onboardingActivation.progressEducation")}
      </p>
    </div>
  );
}
