"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale-provider";

const STEP_KEYS = [
  "verifyingBusiness",
  "connectingWhatsapp",
  "creatingWorkspace",
  "preparingInbox",
  "activatingPipeline",
] as const;

type Phase = "waiting_meta" | "saving";

export function ConnectionProgress({ phase }: { phase: Phase }) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (phase === "waiting_meta") {
      setActiveIndex(0);
      const t1 = window.setTimeout(() => setActiveIndex(1), 2200);
      return () => window.clearTimeout(t1);
    }

    setActiveIndex(2);
    const t2 = window.setTimeout(() => setActiveIndex(3), 900);
    const t3 = window.setTimeout(() => setActiveIndex(4), 1800);
    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [phase]);

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border/60 bg-white px-6 py-10 shadow-[0_8px_30px_rgb(11_28_48/0.06)]">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#128C7E]">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[#0b1c30]">
          {t("onboardingActivation.progressTitle")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {phase === "waiting_meta"
            ? t("onboardingActivation.progressMetaHint")
            : t("onboardingActivation.progressSavingHint")}
        </p>
      </div>

      <ul className="space-y-3">
        {STEP_KEYS.map((key, i) => {
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
    </div>
  );
}
