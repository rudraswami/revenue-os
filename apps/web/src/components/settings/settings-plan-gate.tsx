"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Key, Link2, Lock, Sparkles, Webhook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings/settings-section";
import {
  canAccessSettingsTabRole,
  settingsTabPlanRequirement,
  type SettingsAccessContext,
  type SettingsTabId,
} from "@/lib/settings-access";
import { cn } from "@/lib/utils";

function settingsTabRoleHint(tab: SettingsTabId): string {
  switch (tab) {
    case "billing":
    case "developers":
      return "owners and admins";
    case "whatsapp":
      return "agents and above";
    case "intelligence":
    case "growth":
      return "managers and above";
    default:
      return "your role";
  }
}

const PLAN_GATE_COPY: Record<
  "growth" | "pro",
  {
    planLabel: string;
    headline: string;
    description: string;
    features: Array<{ icon: LucideIcon; title: string; detail: string }>;
    primaryCta: string;
    secondaryCta: string;
  }
> = {
  growth: {
    planLabel: "Growth",
    headline: "Unlock Growth & attribution",
    description:
      "Track which ads and campaigns drive WhatsApp conversations, connect Razorpay for payment → Won, and use the partner install kit.",
    features: [
      {
        icon: Link2,
        title: "Attribution links",
        detail: "Click-to-chat links with UTM tracking for Meta and Google ads.",
      },
      {
        icon: Sparkles,
        title: "Payment → Won",
        detail: "Auto-move deals when Razorpay confirms payment.",
      },
    ],
    primaryCta: "Upgrade to Growth",
    secondaryCta: "Compare plans",
  },
  pro: {
    planLabel: "Operator (Pro)",
    headline: "Unlock Developer access",
    description:
      "Connect Growvisi to your stack — programmatic access to leads and conversations, plus outbound webhooks when pipeline stages change.",
    features: [
      {
        icon: Key,
        title: "API keys",
        detail: "Read leads and conversations from your own integrations.",
      },
      {
        icon: Webhook,
        title: "Outbound webhooks",
        detail: "Notify your CRM or internal tools when deals move or messages arrive.",
      },
    ],
    primaryCta: "Upgrade to Operator (Pro)",
    secondaryCta: "Compare plans",
  },
};

function FeaturePreview({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/80 px-4 py-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export function SettingsAccessPanel({
  tab,
  tabLabel,
  tabDescription,
  ctx,
}: {
  tab: SettingsTabId;
  tabLabel: string;
  tabDescription: string;
  ctx: SettingsAccessContext;
}) {
  const planReq = settingsTabPlanRequirement(tab);
  const roleOk = canAccessSettingsTabRole(tab, ctx.role);

  if (!roleOk) {
    return (
      <SettingsSection title={tabLabel} description={tabDescription}>
        <div className="flex min-h-[420px] flex-col items-center justify-center px-4 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-5 text-lg font-semibold tracking-tight">You don&apos;t have access</p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {tabLabel} is limited to {settingsTabRoleHint(tab)}. Ask a workspace owner or admin
            if you need access.
          </p>
          <Button variant="outline" size="sm" className="mt-6 rounded-xl" asChild>
            <Link href="/dashboard/settings">Back to Overview</Link>
          </Button>
        </div>
      </SettingsSection>
    );
  }

  if (planReq) {
    const copy = PLAN_GATE_COPY[planReq];
    return (
      <SettingsSection title={tabLabel} description={tabDescription}>
        <div className="min-h-[420px] py-2">
          <div className="overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-b from-accent/5 to-background">
            <div className="border-b border-accent/10 px-5 py-6 sm:px-8 sm:py-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {copy.planLabel} plan
                  </p>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {copy.headline}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {copy.description}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button size="sm" className="h-10 rounded-xl px-5" asChild>
                      <Link href="/dashboard/pricing">{copy.primaryCta}</Link>
                    </Button>
                    {canAccessSettingsTabRole("billing", ctx.role) ? (
                      <Button variant="outline" size="sm" className="h-10 rounded-xl px-5" asChild>
                        <Link href="/dashboard/settings?tab=billing">Billing & usage</Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-10 rounded-xl px-5" asChild>
                        <Link href="/dashboard/pricing">{copy.secondaryCta}</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-8 sm:py-6">
              {copy.features.map((feature) => (
                <FeaturePreview key={feature.title} {...feature} />
              ))}
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            14-day trial on all plans · INR billing via Razorpay
          </p>
        </div>
      </SettingsSection>
    );
  }

  return null;
}

/** Shared min-height wrapper so skeletons and loaded content occupy the same space. */
export function SettingsTabContentFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("min-h-[480px] w-full", className)}>{children}</div>;
}
