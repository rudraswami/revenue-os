"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { formatMessage } from "@/lib/i18n/format-message";
import { useI18n } from "@/lib/i18n/locale-provider";
import { connectionSummary, type HealthCheck } from "@/lib/whatsapp-health-copy";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

type ConnectionHealthData = {
  checks: HealthCheck[];
  accounts: Array<{ displayPhoneNumber: string; isActive: boolean }>;
  stats: { inboundCount: number };
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
  const token = useAuthStore((s) => s.accessToken);

  const { data: progress } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: () =>
      apiFetch<{ goLive: { connected: boolean } }>("/organizations/onboarding-progress", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const connected = progress?.goLive?.connected ?? false;

  const { data: health } = useQuery({
    queryKey: ["whatsapp-connection-health"],
    queryFn: () =>
      apiFetch<ConnectionHealthData>("/whatsapp-accounts/connection-health", {
        token: token ?? undefined,
      }),
    enabled: !!token && connected,
    staleTime: 60_000,
  });

  if (!connected || !health) return null;

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
    summary.tone === "warning" ||
    healthPct < 100;

  if (!needsAttention) return null;

  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 sm:px-5",
        summary.tone === "warning" || health.tokenHealth?.needsRefresh
          ? "border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-white"
          : "border-[#dce9ff] bg-gradient-to-r from-[#f8f9ff] to-white",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {health.tokenHealth?.needsRefresh ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
        ) : (
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-[#0b1c30]" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {formatMessage(t("homeBanners.connectionTitle"), { pct: healthPct })}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{summary.subtitle}</p>
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
