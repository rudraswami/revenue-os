"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDashed,
  FileText,
  IndianRupee,
  Loader2,
  MessageCircle,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { WhatsappIngestionVerifier } from "@/components/settings/whatsapp-ingestion-verifier";

type OnboardingProgress = {
  connected: boolean;
  accountId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  progressPct: number;
  steps: Array<{
    id: string;
    done: boolean;
    title: string;
    description: string;
  }>;
  stats: {
    inboundMessages: number;
    classifiedLeads: number;
    pipelineLeads: number;
    templateCount: number;
    approvedTemplateCount: number;
    templatesSynced: boolean;
  };
};

const STEP_ICONS: Record<string, typeof Zap> = {
  webhooks: Zap,
  first_message: MessageCircle,
  classification: Bot,
  pipeline: IndianRupee,
  templates: FileText,
};

export function WhatsappGoLiveChecklist({
  compact = false,
  showTestMessage = true,
}: {
  compact?: boolean;
  showTestMessage?: boolean;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-onboarding-progress"],
    queryFn: () =>
      apiFetch<OnboardingProgress>("/whatsapp-accounts/onboarding-progress", {
        token: token ?? undefined,
      }),
    enabled: !!token,
    refetchInterval: 4000,
  });

  const syncMutation = useMutation({
    mutationFn: (accountId: string) =>
      apiFetch<{ templateCount: number; approvedTemplateCount: number }>(
        `/whatsapp-accounts/${accountId}/sync-templates`,
        { method: "POST", token: token ?? undefined },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-onboarding-progress"] });
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-muted/20 px-5 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading go-live checklist…
      </div>
    );
  }

  if (!data.connected) {
    return null;
  }

  const allDone = data.steps.every((s) => s.done);
  const nextStep = data.steps.find((s) => !s.done);
  const showVerifier =
    showTestMessage && !data.steps.find((s) => s.id === "first_message")?.done && data.displayPhoneNumber;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm",
        compact && "shadow-none",
      )}
    >
      <div className="border-b border-border/80 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Go-live checklist</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {allDone
                ? "Your WhatsApp revenue layer is fully live."
                : nextStep
                  ? `Next: ${nextStep.title.toLowerCase()}`
                  : "Confirm each step to finish setup"}
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-muted/30 px-3 py-2 text-center min-w-[72px]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Progress</p>
            <p className="text-lg font-bold text-foreground">{data.progressPct}%</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <ul className="space-y-2">
          <li className="flex items-start gap-3 rounded-xl border border-[#6cf8bb]/30 bg-[#ecfdf5]/40 px-4 py-3.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#128C7E]">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">WhatsApp connected</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {data.verifiedName ?? "Business line"} · {data.displayPhoneNumber}
              </p>
            </div>
          </li>

          {data.steps.map((step) => {
            const Icon = STEP_ICONS[step.id] ?? CircleDashed;
            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors",
                  step.done
                    ? "border-[#6cf8bb]/30 bg-[#ecfdf5]/40"
                    : "border-border/80 bg-white",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    step.done
                      ? "bg-[#25D366]/15 text-[#128C7E]"
                      : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {showVerifier && data.displayPhoneNumber && (
          <WhatsappIngestionVerifier displayPhoneNumber={data.displayPhoneNumber} />
        )}

        {data.accountId && !data.steps.find((s) => s.id === "templates")?.done && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl"
            disabled={syncMutation.isPending}
            onClick={() => data.accountId && syncMutation.mutate(data.accountId)}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Sync templates from Meta
          </Button>
        )}
        {syncMutation.isError && (
          <p className="text-xs text-destructive">
            {syncMutation.error instanceof ApiError
              ? syncMutation.error.message
              : "Template sync failed."}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" variant={allDone ? "accent" : "outline"} className="gap-1.5 rounded-xl">
            <Link href="/dashboard/inbox">
              Open Conversations
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {data.stats.classifiedLeads > 0 && (
            <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-xl">
              <Link href="/dashboard/pipeline">
                View Pipeline
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          {data.stats.approvedTemplateCount > 0 && (
            <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-xl">
              <Link href="/dashboard/campaigns">
                View Campaigns
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
