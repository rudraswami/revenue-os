"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Circle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

const DISMISS_COMPLETE_KEY = "growvisi-activation-funnel-complete-dismissed";

type Progress = {
  whatsappConnected: boolean;
  firstInbound: boolean;
  aiClassified: boolean;
  pipelineMoved: boolean;
  completedCount: number;
  totalSteps: number;
  allComplete: boolean;
  milestones?: {
    whatsappConnectedAt: string | null;
    firstInboundAt: string | null;
    aiClassifiedAt: string | null;
    pipelineMovedAt: string | null;
    completedAt: string | null;
  };
  funnel?: {
    hoursConnectToInbound: number | null;
    hoursInboundToClassify: number | null;
    hoursClassifyToPipeline: number | null;
    hoursConnectToComplete: number | null;
  };
  nextAction?: { id: string; href: string; title: string };
};

function formatAt(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function formatHours(h: number | null | undefined) {
  if (h == null) return null;
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/**
 * Owner-visible activation funnel: milestone timestamps + time-between steps.
 * Shown when Getting Started is dismissed (or complete) so Home stays uncluttered.
 */
export function ActivationFunnelCard() {
  const token = useAuthStore((s) => s.accessToken);
  const [gettingStartedDismissed, setGettingStartedDismissed] = useState(false);
  const [completeDismissed, setCompleteDismissed] = useState(true);

  useEffect(() => {
    setGettingStartedDismissed(
      localStorage.getItem("growvisi-getting-started-dismissed") === "1",
    );
    setCompleteDismissed(localStorage.getItem(DISMISS_COMPLETE_KEY) === "1");
  }, []);

  const { data: progress } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: () =>
      apiFetch<Progress>("/organizations/onboarding-progress", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (!progress?.whatsappConnected) return null;

  // While Getting Started card is visible, avoid duplicate checklist UI.
  if (!gettingStartedDismissed && !progress.allComplete) return null;
  if (progress.allComplete && completeDismissed) return null;

  const steps = [
    {
      id: "whatsapp",
      label: "Connected",
      done: progress.whatsappConnected,
      at: progress.milestones?.whatsappConnectedAt,
    },
    {
      id: "inbound",
      label: "First message",
      done: progress.firstInbound,
      at: progress.milestones?.firstInboundAt,
      lag: progress.funnel?.hoursConnectToInbound,
    },
    {
      id: "classify",
      label: "Classified",
      done: progress.aiClassified,
      at: progress.milestones?.aiClassifiedAt,
      lag: progress.funnel?.hoursInboundToClassify,
    },
    {
      id: "pipeline",
      label: "Pipeline move",
      done: progress.pipelineMoved,
      at: progress.milestones?.pipelineMovedAt,
      lag: progress.funnel?.hoursClassifyToPipeline,
    },
  ];

  const pct = Math.round((progress.completedCount / progress.totalSteps) * 100);

  return (
    <motion.div
      className="mb-8 overflow-hidden rounded-2xl border border-border bg-white shadow-[0_4px_20px_rgb(11_28_48/0.05)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/80 px-5 py-4">
        <div>
          <p className="text-[15px] font-bold">
            {progress.allComplete ? "Activation complete" : "Activation funnel"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {progress.allComplete
              ? progress.funnel?.hoursConnectToComplete != null
                ? `Connect → pipeline in ${formatHours(progress.funnel.hoursConnectToComplete)}`
                : "WhatsApp → classify → pipeline is live in this workspace."
              : `${progress.completedCount} of ${progress.totalSteps} milestones — next: ${progress.nextAction?.title ?? "continue"}`}
          </p>
        </div>
        {progress.allComplete ? (
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(DISMISS_COMPLETE_KEY, "1");
              setCompleteDismissed(true);
            }}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="h-1.5 bg-[#e5eeff]">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="grid gap-0 sm:grid-cols-2">
        {steps.map((step) => {
          const at = formatAt(step.at);
          const lag = formatHours(step.lag);
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-start gap-3 border-b border-[#dce9ff]/60 px-5 py-3.5 sm:border-r",
                step.done && "bg-[#ecfdf5]/30",
              )}
            >
              {step.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="text-xs text-muted-foreground">
                  {at ? at : step.done ? "Done" : "Pending"}
                  {lag ? ` · +${lag} from prior` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {!progress.allComplete && progress.nextAction ? (
        <div className="border-t border-border/80 px-5 py-3">
          <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-xl">
            <Link href={progress.nextAction.href}>
              {progress.nextAction.title}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      ) : null}
    </motion.div>
  );
}
