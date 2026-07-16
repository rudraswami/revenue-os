"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/locale-provider";

export function OnboardingWelcome({
  onContinue,
  onExplore,
}: {
  onContinue: () => void;
  onExplore: () => void;
}) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
        {t("onboardingActivation.welcomeEyebrow")}
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#0b1c30] sm:text-4xl">
        {t("onboardingActivation.welcomeHeadline")}
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
        {t("onboardingActivation.welcomeSub")}
      </p>
      <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
        <Button size="lg" className="h-12 w-full rounded-xl text-base" onClick={onContinue}>
          {t("onboardingActivation.continue")}
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="h-11 w-full rounded-xl text-muted-foreground"
          onClick={onExplore}
        >
          {t("onboardingActivation.exploreDashboard")}
        </Button>
      </div>
    </motion.div>
  );
}
