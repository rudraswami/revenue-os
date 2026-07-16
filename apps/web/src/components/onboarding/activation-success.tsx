"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Inbox,
  Loader2,
  MessageCircle,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsappGoLiveChecklist } from "@/components/settings/whatsapp-go-live-checklist";
import { trackActivation } from "@/lib/activation-analytics";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n/locale-provider";
import { whatsappChatUrl } from "@/lib/whatsapp-onboarding";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

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
  const token = useAuthStore((s) => s.accessToken);
  const patchOnboarding = useAuthStore((s) => s.patchOnboarding);
  const [showOptional, setShowOptional] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatUrl = phoneNumber ? whatsappChatUrl(phoneNumber) : null;

  useEffect(() => {
    trackActivation("onboarding_whatsapp_connected");
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["conversation-stats"],
    queryFn: () =>
      apiFetch<{ inboundMessages: number }>("/conversations/stats", {
        token: token ?? undefined,
      }),
    enabled: !!token && !!phoneNumber,
    refetchInterval: 3000,
  });

  const firstInbound = (stats?.inboundMessages ?? 0) > 0;

  useEffect(() => {
    if (!firstInbound) return;
    trackActivation("onboarding_first_inbound");
    patchOnboarding({
      whatsappConnected: true,
      firstMessageReceived: true,
      complete: true,
    });
  }, [firstInbound, patchOnboarding]);

  async function copyNumber() {
    if (!phoneNumber) return;
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function openInbox() {
    trackActivation("onboarding_open_conversations", { firstInbound });
    onOpenInbox();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-lg"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.05 }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-bento-mint text-whatsapp"
        >
          <CheckCircle2 className="h-9 w-9" />
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.div
            key={firstInbound ? "live" : "connected"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="display-lg text-foreground">
              {firstInbound
                ? t("onboardingActivation.successLiveTitle")
                : t("onboardingActivation.successTitle")}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              {firstInbound
                ? t("onboardingActivation.successLiveSub")
                : t("onboardingActivation.successSub")}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="mt-8 rounded-2xl border border-accent-light/50 bg-card px-6 py-5 shadow-[0_4px_20px_rgb(11_28_48/0.05)]"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t("onboardingActivation.workspaceReady")}
        </p>
        <p className="mt-2 font-sans text-lg font-bold text-foreground">{businessName}</p>
        {phoneNumber ? (
          <p className="mt-1 text-sm text-muted-foreground">{phoneNumber}</p>
        ) : null}
      </motion.div>

      {phoneNumber && !showAgencyReturn && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.4 }}
          className={cn(
            "mt-5 rounded-2xl border p-5",
            firstInbound
              ? "border-accent-light/50 bg-bento-mint/60"
              : "border-border bg-card",
          )}
        >
          <div className="flex items-start gap-3">
            {firstInbound ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-whatsapp" />
            ) : (
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-accent" />
            )}
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">
                {firstInbound
                  ? t("onboardingActivation.firstWinDoneTitle")
                  : t("onboardingActivation.firstWinTitle")}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {firstInbound
                  ? t("onboardingActivation.firstWinDoneSub")
                  : t("onboardingActivation.firstWinSub")}
              </p>
            </div>
          </div>

          {!firstInbound && (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border bg-muted px-3.5 py-2 text-sm font-semibold text-foreground">
                  {phoneNumber}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => void copyNumber()}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied
                    ? t("onboardingActivation.copied")
                    : t("onboardingActivation.copyNumber")}
                </Button>
                {chatUrl && (
                  <Button
                    asChild
                    size="sm"
                    className="gap-1.5 bg-whatsapp hover:bg-whatsapp/90"
                  >
                    <a href={chatUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {t("onboardingActivation.openWhatsApp")}
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </a>
                  </Button>
                )}
              </div>
              <p className="mt-3 text-left text-xs leading-relaxed text-muted-foreground">
                {t("onboardingActivation.firstWinTip")}
              </p>
            </>
          )}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center"
      >
        {showAgencyReturn ? (
          <Button size="lg" onClick={onAgencyReturn}>
            {t("onboardingActivation.backToAgency")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" onClick={openInbox}>
            <Inbox className="h-4 w-4" />
            {firstInbound
              ? t("onboardingActivation.viewConversation")
              : t("onboardingActivation.openInbox")}
          </Button>
        )}
        <Button
          size="lg"
          variant="outline"
          onClick={() => {
            setShowOptional((v) => !v);
            if (!showOptional) trackActivation("onboarding_optional_setup_open");
          }}
        >
          <Settings2 className="h-4 w-4" />
          {t("onboardingActivation.optionalSetup")}
        </Button>
      </motion.div>

      {!showAgencyReturn && (
        <button
          type="button"
          className="mt-5 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
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
