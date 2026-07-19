"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  MessageSquare,
  RefreshCw,
  Shield,
  Smartphone,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { apiFetch } from "@/lib/api-client";
import {
  connectionSummary,
  healthPillars,
  type HealthCheck,
} from "@/lib/whatsapp-health-copy";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

type ConnectionHealthData = {
  checks: HealthCheck[];
  accounts: Array<{
    displayPhoneNumber: string;
    phoneNumberId: string;
    wabaId: string;
    isActive: boolean;
  }>;
  stats: { conversationCount: number; inboundCount: number };
  reliability?: {
    needsAttention: boolean;
    issues: string[];
    webhookSuccessRate48h: number | null;
    classifySuccessRate48h: number | null;
    webhookTotal48h: number;
    classifyTotal48h: number;
    lastInboundAt: string | null;
    lastClassifiedAt: string | null;
  };
  tokenHealth?: {
    valid: boolean;
    level?: "ok" | "soon" | "urgent";
    needsRefresh: boolean;
    needsAttention?: boolean;
    hoursRemaining: number | null;
    expiresAt: string | null;
    hint?: string;
  };
};

const PILLAR_ICONS: Record<string, typeof Smartphone> = {
  account: Smartphone,
  webhook_url: Zap,
  verify_token: Shield,
  app_secret: Shield,
  messages_ingested: MessageSquare,
  meta_webhooks: Zap,
};

export function WhatsappConnectionHealth() {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["whatsapp-connection-health"],
    queryFn: () =>
      apiFetch<ConnectionHealthData>("/whatsapp-accounts/connection-health", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-6 text-sm text-muted-foreground shadow-sm">
        <GrowvisiSpinner size="xs" className="text-accent" />
        Loading connection status…
      </div>
    );
  }

  const active = data.accounts.find((a) => a.isActive);
  const pillars = healthPillars(data.checks);
  const passed = data.checks.filter((c) => c.ok).length;
  const healthPct = Math.round((passed / data.checks.length) * 100);
  const summary = connectionSummary(data.checks, {
    hasActiveAccount: !!active,
    inboundCount: data.stats.inboundCount,
    tokenNeedsRefresh: data.tokenHealth?.needsRefresh,
  });

  const visiblePillars = active
    ? pillars
    : pillars.filter((p) => !["messages_ingested", "meta_webhooks"].includes(p.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_4px_20px_rgb(11_28_48/0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-medium text-accent">Connection status</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            How your WhatsApp line syncs with Growvisi
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-xl border-border"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        <div
          className={cn(
            "flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between",
            summary.tone === "success" && "border-accent-light/40 bg-bento-mint elev-1",
            summary.tone === "pending" && "border-border bg-card elev-1",
            summary.tone === "warning" && "border-amber-200/80 bg-card elev-1",
          )}
        >
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                summary.tone === "success" && "bg-[#25D366]/15 text-whatsapp",
                summary.tone === "pending" && "bg-bento-blue text-foreground",
                summary.tone === "warning" && "bg-amber-100 text-amber-800",
              )}
            >
              {summary.tone === "success" ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : summary.tone === "pending" ? (
                <CircleDashed className="h-6 w-6" />
              ) : (
                <RefreshCw className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">{summary.label}</p>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                {summary.subtitle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-3 sm:flex-col sm:items-end">
            <div className="rounded-xl border border-border bg-card px-4 py-2.5 text-center min-w-[88px]">
              <p className="text-xs font-medium text-muted-foreground">
                Health
              </p>
              <p className="text-xl font-bold text-foreground">{healthPct}%</p>
            </div>
          </div>
        </div>

        {data.tokenHealth?.needsAttention && (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3.5">
            <p className="text-sm font-semibold text-amber-950">Action required</p>
            <p className="mt-1 text-sm text-amber-900/90">
              {data.tokenHealth.needsRefresh
                ? "Your Meta access token has expired or is about to. Refresh it above to avoid missing customer messages."
                : (data.tokenHealth.hint ?? "Review your Meta access token in the section above.")}
            </p>
          </div>
        )}

        {data.reliability && (data.reliability.needsAttention || data.reliability.webhookTotal48h > 0 || data.reliability.classifyTotal48h > 0) && (
          <div
            className={cn(
              "rounded-xl border px-4 py-3.5",
              data.reliability.needsAttention
                ? "border-amber-200/80 bg-amber-50/60"
                : "border-border bg-background/50",
            )}
          >
            <p className="text-sm font-semibold text-foreground">Reliability (last 48h)</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                Webhooks:{" "}
                <strong className="text-foreground">
                  {data.reliability.webhookSuccessRate48h != null
                    ? `${data.reliability.webhookSuccessRate48h}%`
                    : "—"}
                </strong>
              </span>
              <span>
                Classify:{" "}
                <strong className="text-foreground">
                  {data.reliability.classifySuccessRate48h != null
                    ? `${data.reliability.classifySuccessRate48h}%`
                    : "—"}
                </strong>
              </span>
            </div>
            {data.reliability.issues.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-amber-900/90">
                {data.reliability.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Conversations", value: data.stats.conversationCount },
            { label: "Messages received", value: data.stats.inboundCount },
            {
              label: "Access token",
              value: data.tokenHealth?.needsRefresh
                ? "Refresh"
                : data.tokenHealth?.level === "soon"
                  ? "Soon"
                  : "Active",
              highlight: data.tokenHealth?.needsRefresh || data.tokenHealth?.level === "soon",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-background/50 px-4 py-3"
            >
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p
                className={cn(
                  "mt-0.5 text-lg font-bold",
                  stat.highlight ? "text-amber-700" : "text-foreground",
                )}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-3 text-xs font-medium text-muted-foreground">
            Setup checklist
          </p>
          <ul className="space-y-2">
            {visiblePillars.map((pillar) => {
              const Icon = PILLAR_ICONS[pillar.id] ?? CheckCircle2;
              return (
                <li
                  key={pillar.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors",
                    pillar.status === "complete"
                      ? "border-accent-light/30 bg-bento-mint/40"
                      : pillar.status === "pending"
                        ? "border-border bg-card"
                        : "border-amber-200/60 bg-amber-50/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      pillar.status === "complete"
                        ? "bg-[#25D366]/15 text-whatsapp"
                        : pillar.status === "pending"
                          ? "bg-bento-blue text-foreground"
                          : "bg-amber-100 text-amber-800",
                    )}
                  >
                    {pillar.status === "complete" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{pillar.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {pillar.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {active && data.stats.inboundCount === 0 && (
          <div className="rounded-xl border border-whatsapp/20 bg-bento-mint/50 px-4 py-4">
            <p className="text-sm font-semibold text-foreground">Confirm your first message</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              From your personal phone, send any WhatsApp to{" "}
              <strong className="text-foreground">{active.displayPhoneNumber}</strong>. Meta&apos;s
              outbound &quot;Send test message&quot; won&apos;t appear in Growvisi — only real
              customer messages count.
            </p>
            <Button asChild size="sm" className="mt-4 gap-1.5 rounded-xl">
              <Link href="/dashboard/inbox">
                Open Conversations
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
