"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Bell, ChevronDown, Clock, Timer, Zap } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

function timeAgo(date: string | Date) {
  const ms = Date.now() - new Date(date).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

const autoTypeIcons: Record<string, typeof Zap> = {
  stage: Zap,
  notify: Bell,
  followup: Clock,
  handoff: Activity,
  staleDeal: Timer,
  stageNotify: Bell,
};

export function AutomationActivityZone({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const token = useAuthStore((s) => s.accessToken);
  const [open, setOpen] = useState(defaultOpen);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["automation-logs"],
    queryFn: () =>
      apiFetch<
        Array<{
          id: string;
          automationType: string;
          trigger: string;
          result: string;
          createdAt: string;
        }>
      >("/automations/logs", { token: token ?? undefined }),
    enabled: !!token,
  });

  const hasLogs = (logs?.length ?? 0) > 0;

  return (
    <section id="automation-activity" aria-labelledby="activity-heading" className="scroll-mt-8">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card px-5 py-4 text-left transition hover:bg-muted/15"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" aria-hidden />
          <div>
            <h2 id="activity-heading" className="text-sm font-semibold text-foreground">
              Recent activity
            </h2>
            <p className="text-xs text-muted-foreground">
              {hasLogs ? `${logs!.length} automation runs` : "No runs yet"}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="mt-2 overflow-hidden rounded-2xl border border-border/80 bg-card">
          {isLoading ? (
            <div className="h-32 animate-pulse bg-muted/30" />
          ) : !hasLogs ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              <Activity className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" aria-hidden />
              <p>Team alerts will show up here once they run.</p>
            </div>
          ) : (
            <ul className="max-h-[320px] divide-y divide-border/60 overflow-y-auto custom-scrollbar">
              {logs!.map((log) => {
                const Icon = autoTypeIcons[log.automationType] ?? Zap;
                return (
                  <li key={log.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{log.result}</p>
                      <p className="mt-0.5 text-xs capitalize text-muted-foreground">{log.trigger}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(log.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
