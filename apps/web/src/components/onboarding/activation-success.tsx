"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg"
    >
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#128C7E]">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30] sm:text-3xl">
          {firstInbound
            ? t("onboardingActivation.successLiveTitle")
            : t("onboardingActivation.successTitle")}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          {firstInbound
            ? t("onboardingActivation.successLiveSub")
            : t("onboardingActivation.successSub")}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-[#6cf8bb]/40 bg-white px-6 py-5 shadow-[0_8px_30px_rgb(11_28_48/0.05)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("onboardingActivation.workspaceReady")}
        </p>
        <p className="mt-2 text-lg font-semibold text-[#0b1c30]">{businessName}</p>
        {phoneNumber ? (
          <p className="mt-1 text-sm text-muted-foreground">{phoneNumber}</p>
        ) : null}
      </div>

      {/* First-win: message your number — real activation, not just celebrate connect */}
      {phoneNumber && !showAgencyReturn && (
        <div
          className={cn(
            "mt-6 rounded-2xl border p-5",
            firstInbound
              ? "border-[#6cf8bb]/40 bg-[#ecfdf5]/50"
              : "border-[#dce9ff] bg-white",
          )}
        >
          <div className="flex items-start gap-3">
            {firstInbound ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#128C7E]" />
            ) : (
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-accent" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#0b1c30]">
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
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-xl border border-[#dce9ff] bg-[#f8fafc] px-3.5 py-2 text-sm font-semibold text-foreground">
                {phoneNumber}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl"
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
                  className="gap-1.5 rounded-xl bg-[#25D366] hover:bg-[#1da851]"
                >
                  <a href={chatUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {t("onboardingActivation.openWhatsApp")}
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  </a>
                </Button>
              )}
            </div>
          )}

          {!firstInbound && (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {t("onboardingActivation.firstWinTip")}
            </p>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
        {showAgencyReturn ? (
          <Button size="lg" className="rounded-xl" onClick={onAgencyReturn}>
            {t("onboardingActivation.backToAgency")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="lg" className="rounded-xl" onClick={openInbox}>
            <Inbox className="h-4 w-4" />
            {firstInbound
              ? t("onboardingActivation.viewConversation")
              : t("onboardingActivation.openInbox")}
          </Button>
        )}
        <Button
          size="lg"
          variant="outline"
          className="rounded-xl"
          onClick={() => {
            setShowOptional((v) => !v);
            if (!showOptional) trackActivation("onboarding_optional_setup_open");
          }}
        >
          <Settings2 className="h-4 w-4" />
          {t("onboardingActivation.optionalSetup")}
        </Button>
      </div>

      {!showAgencyReturn && (
        <button
          type="button"
          className="mt-5 w-full text-center text-sm text-muted-foreground hover:text-foreground"
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
