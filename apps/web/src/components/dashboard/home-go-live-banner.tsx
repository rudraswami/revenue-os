"use client";

import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMessage } from "@/lib/i18n/format-message";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useGlobalDashboardBanner } from "@/components/dashboard/use-global-dashboard-banner";
import { useShellAgencyStatus, useShellOnboardingProgress } from "@/hooks/use-shell-data";

/** Home banner when WhatsApp is connected but go-live checklist is incomplete. */
export function HomeGoLiveBanner() {
  const { t } = useI18n();
  const globalBanner = useGlobalDashboardBanner();

  const { data: agencyStatus } = useShellAgencyStatus();
  const { data: progress } = useShellOnboardingProgress<{
    goLive: { connected: boolean; progressPct: number };
  }>({ enabled: !agencyStatus?.isAgency });

  const goLive = progress?.goLive;
  if (agencyStatus?.isAgency || globalBanner || !goLive?.connected || goLive.progressPct >= 100) {
    return null;
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-card elev-1 px-4 py-3.5 sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {formatMessage(t("homeBanners.goLiveTitle"), { pct: goLive.progressPct })}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("homeBanners.goLiveSubtitle")}</p>
        </div>
      </div>
      <Button asChild size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 rounded-xl">
        <Link href="/onboarding">
          {t("homeBanners.goLiveCta")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
