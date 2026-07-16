"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Inbox, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsappGoLiveChecklist } from "@/components/settings/whatsapp-go-live-checklist";
import { useI18n } from "@/lib/i18n/locale-provider";

export function ActivationSuccess({
  businessName,
  phoneNumber,
  onOpenInbox,
  onExploreDashboard,
  showAgencyReturn,
  onAgencyReturn,
}: {
  businessName: string;
  phoneNumber?: string;
  onOpenInbox: () => void;
  onExploreDashboard: () => void;
  showAgencyReturn?: boolean;
  onAgencyReturn?: () => void;
}) {
  const { t } = useI18n();
  const [showOptional, setShowOptional] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg text-center"
    >
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#128C7E]">
        <CheckCircle2 className="h-9 w-9" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30] sm:text-3xl">
        {t("onboardingActivation.successTitle")}
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        {t("onboardingActivation.successSub")}
      </p>

      <div className="mt-8 rounded-2xl border border-[#6cf8bb]/40 bg-white px-6 py-5 text-left shadow-[0_8px_30px_rgb(11_28_48/0.05)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("onboardingActivation.workspaceReady")}
        </p>
        <p className="mt-2 text-lg font-semibold text-[#0b1c30]">{businessName}</p>
        {phoneNumber ? (
          <p className="mt-1 text-sm text-muted-foreground">{phoneNumber}</p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        {showAgencyReturn ? (
          <Button size="lg" className="rounded-xl" onClick={onAgencyReturn}>
            {t("onboardingActivation.backToAgency")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" className="rounded-xl" onClick={onOpenInbox}>
            <Inbox className="h-4 w-4" />
            {t("onboardingActivation.openInbox")}
          </Button>
        )}
        <Button
          size="lg"
          variant="outline"
          className="rounded-xl"
          onClick={() => setShowOptional((v) => !v)}
        >
          <Settings2 className="h-4 w-4" />
          {t("onboardingActivation.optionalSetup")}
        </Button>
      </div>

      {!showAgencyReturn && (
        <button
          type="button"
          className="mt-5 text-sm text-muted-foreground hover:text-foreground"
          onClick={onExploreDashboard}
        >
          {t("onboardingActivation.goToDashboard")}
        </button>
      )}

      {showOptional && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-8 text-left"
        >
          <WhatsappGoLiveChecklist />
        </motion.div>
      )}
    </motion.div>
  );
}
