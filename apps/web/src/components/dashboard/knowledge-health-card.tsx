"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, AlertTriangle, Lightbulb } from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { KNOWLEDGE_SETTINGS_PATH } from "@growvisi/shared";
import { cn } from "@/lib/utils";

export interface KnowledgeHealthResponse {
  docCount: number;
  chunkCount: number;
  lastIndexedAt: string | null;
  gapRiskScore: number;
  readyForResponsivePreset: boolean;
}

function riskLabel(score: number): { label: string; tone: string } {
  if (score >= 80) return { label: "High gap risk", tone: "text-warning bg-warning/10" };
  if (score >= 35) return { label: "Some gaps", tone: "text-warning bg-warning/10" };
  return { label: "Well covered", tone: "text-accent bg-bento-mint/60" };
}

export function KnowledgeHealthCard({ className }: { className?: string }) {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["knowledge-health"],
    queryFn: () =>
      apiFetch<KnowledgeHealthResponse>("/knowledge/health", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    retry: false,
  });

  const risk = data ? riskLabel(data.gapRiskScore) : null;

  return (
    <DashboardPanel
      title="Business Knowledge health"
      description="Growvisi only auto-sends when answers are grounded in your docs."
      className={className}
    >
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-full" />
        </div>
      ) : isError || !data ? (
        <p className="text-sm text-muted-foreground">
          Could not load knowledge health. Check business knowledge in Settings → AI & replies.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{data.chunkCount}</p>
              <p className="text-xs text-muted-foreground">
                indexed chunks · {data.docCount} doc{data.docCount === 1 ? "" : "s"}
              </p>
            </div>
            {risk && (
              <span
                className={cn(
                  "ml-auto rounded-full px-2.5 py-1 text-xs font-semibold",
                  risk.tone,
                )}
              >
                {risk.label}
              </span>
            )}
          </div>

          {data.gapRiskScore >= 50 && (
            <div className="flex gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-xs leading-relaxed text-warning">
                {data.chunkCount === 0
                  ? "Upload your rate card and FAQs before enabling Responsive auto-send."
                  : "Add pricing, policy, and delivery docs so Growvisi can answer completely."}
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Gap risk score: <span className="font-medium text-foreground">{data.gapRiskScore}/100</span>
            {data.lastIndexedAt
              ? ` · Last indexed ${new Date(data.lastIndexedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
              : null}
          </p>

          <Link
            href={KNOWLEDGE_SETTINGS_PATH}
            className="inline-flex text-sm font-semibold text-accent hover:underline"
          >
            Manage business knowledge →
          </Link>

          <KnowledgeGapRecommendations />
        </div>
      )}
    </DashboardPanel>
  );
}

interface GapRecommendation {
  topic: string;
  count: number;
  message: string;
}

interface GapRecommendationsResponse {
  totalClassifications: number;
  totalGaps: number;
  gapRate: number;
  recommendations: GapRecommendation[];
}

function KnowledgeGapRecommendations() {
  const token = useAuthStore((s) => s.accessToken);

  const { data } = useQuery({
    queryKey: ["knowledge-gap-recommendations"],
    queryFn: () =>
      apiFetch<GapRecommendationsResponse>("/knowledge/gap-recommendations", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (!data?.recommendations?.length) return null;

  return (
    <div className="mt-1 space-y-2">
      <div className="flex items-center gap-1.5">
        <Lightbulb className="h-3.5 w-3.5 text-accent" />
        <p className="text-xs font-semibold text-foreground">
          What your customers are asking about
        </p>
      </div>
      <div className="space-y-1.5">
        {data.recommendations.map((rec) => (
          <div
            key={rec.topic}
            className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
          >
            <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">
              {rec.count}
            </span>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Customers asked about <span className="font-medium text-foreground">{rec.topic}</span>{" "}
              {rec.count} time{rec.count === 1 ? "" : "s"} this week
            </p>
          </div>
        ))}
      </div>
      {data.gapRate > 20 && (
        <p className="text-[11px] text-muted-foreground">
          {data.gapRate}% of conversations hit a knowledge gap.{" "}
          <Link
            href={KNOWLEDGE_SETTINGS_PATH}
            className="font-semibold text-accent hover:underline"
          >
            Add docs to improve auto-reply →
          </Link>
        </p>
      )}
    </div>
  );
}
