"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMessage } from "@/lib/i18n/format-message";
import { useI18n } from "@/lib/i18n/locale-provider";
import { connectionSummary, type HealthCheck } from "@/lib/whatsapp-health-copy";
import { useGlobalDashboardBanner } from "@/components/dashboard/use-global-dashboard-banner";
import { useShellConnectionHealth, useShellOnboardingProgress } from "@/hooks/use-shell-data";
import { cn } from "@/lib/utils";

type ConnectionHealthData = {
  checks: HealthCheck[];
  accounts: Array<{ displayPhoneNumber: string; isActive: boolean }>;
  stats: { inboundCount: number };
  reliability?: {
    needsAttention: boolean;
    issues: string[];
    webhookSuccessRate48h: number | null;
    classifySuccessRate48h: number | null;
  };
  tokenHealth?: {
    valid?: boolean;
    needsRefresh: boolean;
    needsAttention?: boolean;
    hoursRemaining: number | null;
  };
};

/** Compact Home alert when WhatsApp connection needs attention (not full settings panel). */
export function HomeConnectionHealthBanner() {
  const { t } = useI18n();
  const globalBanner = useGlobalDashboardBanner();

  const { data: progress } = useShellOnboardingProgress<{ goLive: { connected: boolean } }>();
  const connected = progress?.goLive?.connected ?? false;

  const { data: health } = useShellConnectionHealth<ConnectionHealthData>({
    enabled: connected,
  });

  if (globalBanner || !connected || !health?.checks?.length) return null;

  const passed = health.checks.filter((c) => c.ok).length;
  const healthPct = health.checks.length
    ? Math.round((passed / health.checks.length) * 100)
    : 100;
  const summary = connectionSummary(health.checks, {
    hasActiveAccount: true,
    inboundCount: health.stats.inboundCount,
    tokenNeedsRefresh: health.tokenHealth?.needsRefresh,
  });

  const needsAttention =
    health.tokenHealth?.needsAttention ||
    health.tokenHealth?.needsRefresh ||
    health.reliability?.needsAttention ||
    summary.tone === "warning" ||
    healthPct < 100;

  if (!needsAttention) return null;

  const reliabilityIssue = health.reliability?.issues?.[0];
  const subtitle = reliabilityIssue ?? summary.subtitle;

  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 sm:px-5",
        summary.tone === "warning" || health.tokenHealth?.needsRefresh
          ? "border-warning/30 bg-card elev-1"
          : "border-border bg-card elev-1",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {health.tokenHealth?.needsRefresh ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        ) : (
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-foreground" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {formatMessage(t("homeBanners.connectionTitle"), { pct: healthPct })}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Button asChild size="sm" variant="outline" className="h-8 shrink-0 gap-1.5 rounded-xl">
        <Link href="/dashboard/connection">
          {t("homeBanners.connectionReview")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
