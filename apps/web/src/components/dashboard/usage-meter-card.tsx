"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { UpgradeFrictionBanner } from "@/components/dashboard/upgrade-friction-banner";
import { trackConversionFriction } from "@/lib/conversion-friction-analytics";

interface BillingUsage {
  planId: string;
  planName: string;
  usage: {
    whatsappNumbers: number;
    teamMembers: number;
    monthlyLeads: number;
    agencyClients?: number;
  };
  limits: {
    whatsappNumbers: number;
    teamMembers: number;
    monthlyLeads: number;
    agencyClients: number;
  };
  entitlements?: { trialEndsAt: string | null; trialExpired: boolean };
  friction?: {
    seatsAtLimit: boolean;
    whatsappAtLimit: boolean;
    leadsAtLimit: boolean;
    agencyAtLimit: boolean;
    nearLimit: boolean;
    primaryReason: string | null;
    suggestedPlan: string | null;
  };
}

function MeterBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const hot = pct >= 85;

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className={cn("font-semibold", hot && "text-amber-800")}>
          {used.toLocaleString("en-IN")} / {limit.toLocaleString("en-IN")}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", hot ? "bg-amber-500" : "bg-accent")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function UsageMeterCard({ compact }: { compact?: boolean }) {
  const token = useAuthStore((s) => s.accessToken);

  const { data } = useQuery({
    queryKey: ["billing-status"],
    queryFn: () => apiFetch<BillingUsage>("/billing", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 120_000,
  });

  if (!data) return null;

  const planLabel =
    data.planId === "starter"
      ? "Solo"
      : data.planId === "growth"
        ? "Team"
        : data.planId === "pro"
          ? "Operator"
          : data.planName;

  if (compact) {
    const leadPct =
      data.limits.monthlyLeads > 0
        ? Math.round((data.usage.monthlyLeads / data.limits.monthlyLeads) * 100)
        : 0;
    const friction = data.friction;
    const href = friction?.suggestedPlan
      ? `/dashboard/pricing?plan=${friction.suggestedPlan}&reason=${friction.primaryReason ?? "limit"}`
      : "/dashboard/pricing";
    return (
      <Link
        href={href}
        onClick={() => {
          if (friction?.primaryReason || friction?.nearLimit) {
            trackConversionFriction("conversion_friction_click", {
              reason: friction.primaryReason ?? "near_limit",
              surface: "usage_meter_compact",
            });
          }
        }}
        className="flex items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs hover:bg-[#f8f9ff]"
      >
        <span className="text-muted-foreground">
          {planLabel} · {data.usage.monthlyLeads}/{data.limits.monthlyLeads} leads this month
        </span>
        <span
          className={cn(
            "font-semibold",
            friction?.leadsAtLimit || leadPct >= 85 ? "text-amber-800" : "text-accent",
          )}
        >
          {leadPct}%
        </span>
      </Link>
    );
  }

  const friction = data.friction;
  const frictionMessage =
    friction?.primaryReason === "seats"
      ? "Team seats are full — upgrade to invite the next agent."
      : friction?.primaryReason === "whatsapp"
        ? "WhatsApp number slots are full — upgrade to connect another line."
        : friction?.primaryReason === "leads"
          ? "Monthly lead capacity is full — upgrade so new WhatsApp leads keep scoring."
          : friction?.primaryReason === "agency_clients"
            ? "Agency client slots are full."
            : friction?.nearLimit
              ? "You're near a plan limit — upgrade before work stalls."
              : null;

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Plan usage</p>
          <p className="text-sm font-bold">{planLabel}</p>
        </div>
        <Link
          href={
            friction?.suggestedPlan
              ? `/dashboard/pricing?plan=${friction.suggestedPlan}`
              : "/dashboard/pricing"
          }
          className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
        >
          Plans
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-3">
        <MeterBar
          used={data.usage.monthlyLeads}
          limit={data.limits.monthlyLeads}
          label="Classified leads (this month)"
        />
        <MeterBar
          used={data.usage.teamMembers}
          limit={data.limits.teamMembers}
          label="Team members"
        />
        <MeterBar
          used={data.usage.whatsappNumbers}
          limit={data.limits.whatsappNumbers}
          label="WhatsApp numbers"
        />
        {data.planId === "pro" && data.limits.agencyClients > 0 && (
          <MeterBar
            used={data.usage.agencyClients ?? 0}
            limit={data.limits.agencyClients}
            label="Agency hub clients"
          />
        )}
      </div>
      {frictionMessage && (
        <UpgradeFrictionBanner
          className="mt-3"
          compact
          reason={friction?.primaryReason ?? "leads"}
          message={frictionMessage}
          suggestedPlan={friction?.suggestedPlan}
        />
      )}
      {data.entitlements?.trialEndsAt && data.planId === "trial" && !frictionMessage && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Trial ends {new Date(data.entitlements.trialEndsAt).toLocaleDateString("en-IN")} · 500 lead
          cap applies during trial
        </p>
      )}
    </div>
  );
}
