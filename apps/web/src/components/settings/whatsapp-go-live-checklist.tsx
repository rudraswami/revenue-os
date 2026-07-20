"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { apiFetch, ApiError, toUserMessage } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useShellOnboardingProgress } from "@/hooks/use-shell-data";
import { invalidateWorkspaceShellCache } from "@/lib/session-query-cache";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { WhatsappIngestionVerifier } from "@/components/settings/whatsapp-ingestion-verifier";

type GoLiveProgress = {
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

type OnboardingProgressResponse = {
  goLive: GoLiveProgress;
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
  const { t } = useI18n();
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const { data, isLoading } = useShellOnboardingProgress<OnboardingProgressResponse>({
    refetchInterval: 4000,
  });

  const goLive = data?.goLive;

  const syncMutation = useMutation({
    mutationFn: (accountId: string) =>
      apiFetch<{ templateCount: number; approvedTemplateCount: number }>(
        `/whatsapp-accounts/${accountId}/sync-templates`,
        { method: "POST", token: token ?? undefined },
      ),
    onSuccess: () => {
      invalidateWorkspaceShellCache(queryClient);
    },
  });

  if (isLoading || !goLive) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-muted/20 px-5 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("whatsappGoLive.loading")}
      </div>
    );
  }

  if (!goLive.connected) {
    return null;
  }

  const allDone = goLive.steps.every((s) => s.done);
  const nextStep = goLive.steps.find((s) => !s.done);
  const showVerifier =
    showTestMessage &&
    !goLive.steps.find((s) => s.id === "first_message")?.done &&
    goLive.displayPhoneNumber;

  function stepTitle(stepId: string, fallback: string) {
    const key = `whatsappGoLive.stepTitles.${stepId}`;
    const translated = t(key);
    return translated === key ? fallback : translated;
  }

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
            <p className="text-xs font-medium text-accent">
              {t("whatsappGoLive.title")}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {allDone
                ? t("whatsappGoLive.allComplete")
                : nextStep
                  ? `${t("whatsappGoLive.nextPrefix")} ${stepTitle(nextStep.id, nextStep.title).toLowerCase()}`
                  : t("whatsappGoLive.confirmEach")}
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-muted/30 px-3 py-2 text-center min-w-[72px]">
            <p className="text-xs font-medium text-muted-foreground">
              {t("whatsappGoLive.progress")}
            </p>
            <p className="text-lg font-bold text-foreground">{goLive.progressPct}%</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <ul className="space-y-2">
          <li className="flex items-start gap-3 rounded-xl border border-accent-light/30 bg-bento-mint/40 px-4 py-3.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366]/15 text-whatsapp">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{t("whatsappGoLive.connected")}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {goLive.verifiedName ?? "Business line"} · {goLive.displayPhoneNumber}
              </p>
            </div>
          </li>

          {goLive.steps.map((step) => {
            const Icon = STEP_ICONS[step.id] ?? CircleDashed;
            return (
              <li
                key={step.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors",
                  step.done
                    ? "border-accent-light/30 bg-bento-mint/40"
                    : "border-border/80 bg-card",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    step.done
                      ? "bg-[#25D366]/15 text-whatsapp"
                      : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {stepTitle(step.id, step.title)}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {showVerifier && goLive.displayPhoneNumber && (
          <WhatsappIngestionVerifier displayPhoneNumber={goLive.displayPhoneNumber} />
        )}

        {goLive.accountId && !goLive.steps.find((s) => s.id === "templates")?.done && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-xl"
            disabled={syncMutation.isPending}
            onClick={() => goLive.accountId && syncMutation.mutate(goLive.accountId)}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {t("whatsappGoLive.syncTemplates")}
          </Button>
        )}
        {syncMutation.isError && (
          <p className="text-xs text-destructive">
            {toUserMessage(syncMutation.error, t("whatsappGoLive.syncFailed"))}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" variant={allDone ? "accent" : "outline"} className="gap-1.5 rounded-xl">
            <Link href="/dashboard/inbox">
              {t("whatsappGoLive.openConversations")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          {goLive.stats.classifiedLeads > 0 && (
            <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-xl">
              <Link href="/dashboard/pipeline">
                {t("whatsappGoLive.viewPipeline")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          {goLive.stats.approvedTemplateCount > 0 && (
            <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-xl">
              <Link href="/dashboard/campaigns">
                {t("whatsappGoLive.viewCampaigns")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
