"use client";

import Link from "next/link";
import {
  Building2,
  BookOpen,
  CheckCircle2,
  Circle,
  CreditCard,
  MessageCircle,
  Users,
} from "lucide-react";
import { SettingsSection } from "@/components/settings/settings-section";
import { WorkspaceOverview, WorkspaceOverviewLinks } from "@/components/settings/workspace-overview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ShellBootstrapResponse } from "@/lib/shell-bootstrap";

interface WorkspaceHomeProps {
  bootstrap?: ShellBootstrapResponse;
  bootstrapLoading?: boolean;
}

export function WorkspaceHome({ bootstrap, bootstrapLoading }: WorkspaceHomeProps) {
  const waConnected = bootstrap?.whatsapp.accounts.some((a) => a.isActive) ?? false;
  const waHealthy = bootstrap?.whatsapp.connectionHealth?.tokenHealth?.valid !== false;
  const planId =
    (bootstrap?.billing as { planId?: string } | undefined)?.planId ??
    bootstrap?.billing?.entitlements?.planId;
  const teamUsed = bootstrap?.billing?.usage?.teamMembers;
  const teamLimit = bootstrap?.billing?.limits?.teamMembers;
  const progress = bootstrap?.onboardingProgress;

  const setupSteps = [
    {
      id: "whatsapp",
      label: "WhatsApp connected",
      done: waConnected,
      href: "/dashboard/settings?tab=whatsapp",
    },
    {
      id: "message",
      label: "First customer message received",
      done: !!progress?.firstInbound,
      href: "/dashboard/inbox",
    },
    {
      id: "billing",
      label: "Plan active",
      done: bootstrap?.billing?.entitlements?.hasAccess !== false,
      href: "/dashboard/settings?tab=billing",
    },
  ];

  const setupComplete = setupSteps.every((s) => s.done);

  return (
    <div className="space-y-5">
      <SettingsSection
        title="Workspace overview"
        description="Health of your workspace — plan, team, and WhatsApp connection."
      >
        <WorkspaceOverview bootstrap={bootstrap} bootstrapLoading={bootstrapLoading} />
        <div className="mt-4">
          <WorkspaceOverviewLinks />
        </div>
      </SettingsSection>

      <div className="grid gap-3 sm:grid-cols-2">
        <HealthCard
          icon={MessageCircle}
          title="WhatsApp"
          loading={bootstrapLoading}
          status={
            !bootstrap
              ? "—"
              : waConnected
                ? waHealthy
                  ? "Connected"
                  : "Needs attention"
                : "Not connected"
          }
          tone={
            waConnected && waHealthy ? "good" : waConnected ? "warn" : "muted"
          }
          href="/dashboard/settings?tab=whatsapp"
        />
        <HealthCard
          icon={Users}
          title="Team"
          loading={bootstrapLoading}
          status={
            teamUsed != null && teamLimit != null ? `${teamUsed} / ${teamLimit} seats` : "—"
          }
          tone="muted"
          href="/dashboard/settings?tab=people"
        />
        <HealthCard
          icon={CreditCard}
          title="Billing"
          loading={bootstrapLoading}
          status={planId ? formatPlan(planId) : "—"}
          tone="muted"
          href="/dashboard/settings?tab=billing"
        />
        <HealthCard
          icon={BookOpen}
          title="AI & replies"
          loading={bootstrapLoading}
          status="Business knowledge"
          tone="muted"
          href="/dashboard/settings?tab=intelligence"
        />
        <HealthCard
          icon={Building2}
          title="Setup progress"
          loading={bootstrapLoading}
          status={
            setupComplete
              ? "Complete"
              : `${setupSteps.filter((s) => s.done).length}/${setupSteps.length} done`
          }
          tone={setupComplete ? "good" : "muted"}
          href="/dashboard/settings?tab=whatsapp"
        />
      </div>

      {!setupComplete && (
        <SettingsSection
          title="Setup checklist"
          description="Finish these to get full value from Growvisi."
        >
          <ul className="space-y-2">
            {setupSteps.map((step) => (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className="flex items-center gap-3 rounded-xl border border-border/80 bg-background/60 px-4 py-3 text-sm transition hover:border-accent/30 hover:bg-accent/5"
                >
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span className={cn(step.done && "text-muted-foreground")}>{step.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <Button size="sm" className="rounded-xl" asChild>
              <Link href="/onboarding">Continue setup</Link>
            </Button>
          </div>
        </SettingsSection>
      )}
    </div>
  );
}

function formatPlan(planId: string) {
  if (planId === "trial") return "Trial";
  return planId.charAt(0).toUpperCase() + planId.slice(1);
}

function HealthCard({
  icon: Icon,
  title,
  status,
  tone,
  href,
  loading,
}: {
  icon: typeof MessageCircle;
  title: string;
  status: string;
  tone: "good" | "warn" | "muted";
  href: string;
  loading?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-2xl border border-border/80 bg-card p-4 transition hover:border-accent/25 hover:shadow-sm",
        tone === "good" && "border-accent/20 bg-accent/5",
        tone === "warn" && "border-amber-200/80 bg-amber-50/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-xs font-medium text-muted-foreground">{title}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold",
          loading && "animate-pulse text-muted-foreground",
        )}
      >
        {loading ? "Loading…" : status}
      </p>
    </Link>
  );
}
