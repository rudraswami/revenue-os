"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Brain,
  ChevronRight,
  MessageSquare,
  UserRound,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { IntelligenceWorkspaceSettings } from "@growvisi/shared";
import { AUTOMATIONS_PATH } from "@growvisi/shared";
import { apiFetch } from "@/lib/api-client";
import { autonomyLabel } from "@/lib/automation-scenarios";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { KnowledgeHealthResponse } from "@/components/dashboard/knowledge-health-card";

const FLOW = [
  { icon: BookOpen, label: "Add docs" },
  { icon: Brain, label: "AI classifies" },
  { icon: UserRound, label: "You reply" },
] as const;

function kbBadge(chunkCount: number, gapRiskScore: number): { label: string; tone: string } {
  if (chunkCount === 0) return { label: "Empty", tone: "bg-warning/15 text-warning" };
  if (gapRiskScore >= 50) return { label: "Gaps", tone: "bg-warning/15 text-warning" };
  return { label: "Ready", tone: "bg-bento-mint text-accent" };
}

export function IntelligenceTabHeader() {
  const token = useAuthStore((s) => s.accessToken);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["intelligence-settings"],
    queryFn: () =>
      apiFetch<IntelligenceWorkspaceSettings>("/organizations/intelligence-settings", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const { data: kbHealth, isLoading: kbLoading } = useQuery({
    queryKey: ["knowledge-health"],
    queryFn: () =>
      apiFetch<KnowledgeHealthResponse>("/knowledge/health", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const isLoading = settingsLoading || kbLoading;
  const mode = settings?.replyAutonomy ?? "assist";
  const kb = kbBadge(kbHealth?.chunkCount ?? 0, kbHealth?.gapRiskScore ?? 0);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-bento-mint/50 via-card to-card shadow-sm ring-1 ring-accent/10">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl"
        aria-hidden
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-1">
          {FLOW.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex items-center gap-1 sm:gap-2">
                <div className="flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 shadow-sm ring-1 ring-border/60 backdrop-blur-sm">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bento-mint text-accent">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="text-xs font-semibold text-foreground">{step.label}</span>
                </div>
                {index < FLOW.length - 1 ? (
                  <ChevronRight
                    className="hidden h-4 w-4 shrink-0 text-muted-foreground/70 sm:block"
                    aria-hidden
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
          {isLoading ? (
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-32 rounded-full" />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium ring-1 ring-border/60">
                <MessageSquare className="h-3.5 w-3.5 text-accent" aria-hidden />
                <span className="text-muted-foreground">Mode</span>
                <span className="font-semibold text-foreground">{autonomyLabel(mode)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium ring-1 ring-border/60">
                <BookOpen className="h-3.5 w-3.5 text-accent" aria-hidden />
                <span className="font-semibold tabular-nums text-foreground">
                  {kbHealth?.chunkCount ?? 0}
                </span>
                <span className="text-muted-foreground">chunks</span>
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", kb.tone)}>
                  {kb.label}
                </span>
              </span>
            </div>
          )}

          <Link
            href={AUTOMATIONS_PATH}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent transition hover:underline"
          >
            Reply policy in Automations
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
