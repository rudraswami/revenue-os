"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { IntelligenceWorkspaceSettings } from "@growvisi/shared";
import { AUTOMATIONS_PATH } from "@growvisi/shared";
import { apiFetch } from "@/lib/api-client";
import {
  AUTONOMY_OPTIONS,
  autonomyLabel,
  presetLabel,
} from "@/lib/automation-scenarios";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import type { KnowledgeHealthResponse } from "@/components/dashboard/knowledge-health-card";

function kbHealthTone(chunkCount: number, gapRiskScore: number): string {
  if (chunkCount === 0) return "text-amber-900 bg-amber-50";
  if (gapRiskScore >= 50) return "text-amber-900 bg-amber-50/80";
  return "text-accent bg-bento-mint/60";
}

function kbHealthLabel(chunkCount: number, gapRiskScore: number): string {
  if (chunkCount === 0) return "No docs indexed";
  if (gapRiskScore >= 80) return "High gap risk";
  if (gapRiskScore >= 35) return "Some gaps";
  return "Well covered";
}

export function IntelligenceStatusOverview() {
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
  const modeMeta = AUTONOMY_OPTIONS.find((o) => o.mode === mode);
  const preset = settings?.automationPreset ?? "balanced";

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-10 w-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-background/50 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bento-mint text-accent">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reply mode
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{autonomyLabel(mode)}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {modeMeta?.subtitle ?? "Growvisi classifies and assists your team."}
              </p>
              {mode === "auto_guarded" && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Preset: <span className="font-medium text-foreground">{presetLabel(preset)}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-background/50 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Business knowledge
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground tabular-nums">
                  {kbHealth?.chunkCount ?? 0} chunks
                </p>
                {kbHealth && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      kbHealthTone(kbHealth.chunkCount, kbHealth.gapRiskScore),
                    )}
                  >
                    {kbHealthLabel(kbHealth.chunkCount, kbHealth.gapRiskScore)}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {kbHealth?.docCount ?? 0} doc{(kbHealth?.docCount ?? 0) === 1 ? "" : "s"} indexed
                {kbHealth?.lastIndexedAt
                  ? ` · last ${new Date(kbHealth.lastIndexedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                  : null}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 rounded-xl border border-border/60 bg-muted/25 px-4 py-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Reply policy — who sends messages on WhatsApp — is configured in{" "}
          <span className="font-medium text-foreground">Automations</span>. This tab is for the
          business knowledge and quick replies your team uses when they reply.
        </p>
      </div>

      <Button variant="outline" size="sm" className="rounded-xl" asChild>
        <Link href={AUTOMATIONS_PATH}>
          Change reply policy in Automations
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
