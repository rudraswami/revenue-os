"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackActivation } from "@/lib/activation-analytics";
import { useI18n } from "@/lib/i18n/locale-provider";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function OnboardingWelcome({
  onContinue,
  onExplore,
}: {
  onContinue: () => void;
  onExplore: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    trackActivation("onboarding_welcome_view");
  }, []);

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-lg flex-col items-center justify-center px-1 py-10 text-center">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/4 -z-10 mx-auto h-64 w-64 rounded-full bg-[#25D366]/10 blur-3xl"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      <motion.p
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent"
      >
        Growvisi
      </motion.p>

      <motion.h1
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-5 text-[1.75rem] font-bold leading-tight tracking-tight text-[#0b1c30] sm:text-4xl sm:leading-[1.15]"
      >
        {t("onboardingActivation.welcomeHeadline")}
      </motion.h1>

      <motion.p
        custom={2}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted-foreground"
      >
        {t("onboardingActivation.welcomeSub")}
      </motion.p>

      <motion.p
        custom={3}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-8 text-sm font-medium tracking-wide text-[#0b1c30]/55"
      >
        {t("onboardingActivation.welcomePillarsLine")}
      </motion.p>

      <motion.div
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-10 flex w-full max-w-xs flex-col gap-3"
      >
        <Button
          size="lg"
          className="h-12 w-full rounded-2xl text-base shadow-lg shadow-[#0b1c30]/10 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => {
            trackActivation("onboarding_welcome_continue");
            onContinue();
          }}
        >
          {t("onboardingActivation.continue")}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <button
          type="button"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={onExplore}
        >
          {t("onboardingActivation.exploreShort")}
        </button>
      </motion.div>
    </div>
  );
}
