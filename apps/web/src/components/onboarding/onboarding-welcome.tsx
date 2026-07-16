"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackActivation } from "@/lib/activation-analytics";
import { useI18n } from "@/lib/i18n/locale-provider";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.07 * i, duration: 0.48, ease },
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
    <div className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-lg flex-col items-center justify-center px-1 py-12 text-center">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[18%] -z-10 mx-auto h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />

      <motion.p
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="section-label"
      >
        Growvisi
      </motion.p>

      <motion.h1
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="display-lg mt-5 max-w-md text-foreground"
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
        className="mt-8 text-sm font-semibold tracking-wide text-foreground/50"
      >
        {t("onboardingActivation.welcomePillarsLine")}
      </motion.p>

      <motion.div
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-10 flex w-full max-w-xs flex-col items-center gap-3"
      >
        <Button
          size="lg"
          className="h-12 w-full shadow-[0_8px_24px_rgb(11_28_48/0.12)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
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
          className="py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          onClick={onExplore}
        >
          {t("onboardingActivation.exploreShort")}
        </button>
      </motion.div>
    </div>
  );
}
