"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
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
      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Loading connection diagnostics…
      </div>
    );
  }

  const active = data.accounts.find((a) => a.isActive);

  return (
    <div className="rounded-xl border border-border bg-muted/20 px-4 py-4 text-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-semibold text-foreground">Message ingestion diagnostics</p>
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

      <ul className="space-y-1.5">
        {data.checks.map((c) => (
          <li key={c.id} className={cn("font-mono text-xs", c.ok ? "text-success" : "text-amber-800")}>
            {c.ok ? "✓" : "○"} {c.detail}
          </li>
        ))}
      </ul>

      {active && (
        <p className="mt-3 text-xs text-muted-foreground">
          Send a WhatsApp <strong className="text-foreground">to {active.displayPhoneNumber}</strong>{" "}
          from your personal phone (not from the business test number).
        </p>
      )}

      <p className="mt-2 text-xs text-amber-900/90">{data.metaSetup.testTip}</p>

      {data.recentWebhooks.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-foreground">
            Recent Meta webhooks (48h)
          </summary>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto font-mono text-[10px] text-muted-foreground">
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
  );
}
