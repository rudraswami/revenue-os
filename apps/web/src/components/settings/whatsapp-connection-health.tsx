"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export function WhatsappConnectionHealth() {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["whatsapp-connection-health"],
    queryFn: () =>
      apiFetch<{
        checks: Array<{ id: string; ok: boolean; detail: string }>;
        accounts: Array<{
          displayPhoneNumber: string;
          phoneNumberId: string;
          wabaId: string;
          isActive: boolean;
        }>;
        stats: { conversationCount: number; inboundCount: number };
        metaSetup: { webhookUrl: string; testTip: string };
        recentWebhooks: Array<{
          at: string;
          processed: boolean;
          error: string | null;
          inboundInPayload: number;
          matchesYourAccount: boolean;
        }>;
      }>("/whatsapp-accounts/connection-health", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading connection diagnostics…
        </div>
      </div>
    );
  }

  const active = data.accounts.find((a) => a.isActive);
  const passedChecks = data.checks.filter((c) => c.ok).length;

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Message ingestion diagnostics</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="space-y-4 p-4 text-sm">
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg bg-primary-soft/50 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Checks passed</span>
            <p className="font-semibold text-primary">
              {passedChecks}/{data.checks.length}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Conversations</span>
            <p className="font-semibold">{data.stats.conversationCount}</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Inbound messages</span>
            <p className="font-semibold">{data.stats.inboundCount}</p>
          </div>
        </div>

        <ul className="space-y-2">
          {data.checks.map((c) => (
            <li
              key={c.id}
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
                c.ok ? "bg-success/5 text-foreground" : "bg-amber-50 text-amber-950",
              )}
            >
              {c.ok ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              ) : (
                <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              )}
              <span className="font-mono leading-relaxed">{c.detail}</span>
            </li>
          ))}
        </ul>

        {active && (
          <p className="rounded-lg border border-[#128C7E]/20 bg-[#25D366]/5 px-3 py-2.5 text-xs text-muted-foreground">
            Send a WhatsApp <strong className="text-foreground">to {active.displayPhoneNumber}</strong>{" "}
            from your personal phone (not from the business test number).
          </p>
        )}

        <p className="rounded-lg bg-amber-50/80 px-3 py-2 text-xs text-amber-900">{data.metaSetup.testTip}</p>

        {data.recentWebhooks.length > 0 && (
          <details className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-foreground">
              Recent Meta webhooks (48h)
            </summary>
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto font-mono text-[10px] text-muted-foreground custom-scrollbar">
              {data.recentWebhooks.map((w) => (
                <li key={w.at}>
                  {new Date(w.at).toLocaleString()} · msgs={w.inboundInPayload} ·
                  {w.matchesYourAccount ? " yours" : " other"} ·
                  {w.processed ? " processed" : " pending"}
                  {w.error ? ` · err: ${w.error}` : ""}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
