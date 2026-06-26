"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { canWrite } from "@/lib/permissions";

export type InsightAction = {
  type: "link" | "api";
  label: string;
  href?: string;
  endpoint?: string;
  method?: string;
};

export function InsightActionButtons({
  insightId,
  actions,
  compact,
  onActionDone,
}: {
  insightId: string;
  actions: InsightAction[];
  compact?: boolean;
  onActionDone?: () => void;
}) {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canEdit = canWrite(role);
  const qc = useQueryClient();

  const apiMut = useMutation({
    mutationFn: async (action: InsightAction) => {
      const endpoint = action.endpoint!;
      const body =
        endpoint.includes("create-tasks")
          ? { insightId }
          : endpoint.includes("assign-handoffs")
            ? {}
            : {};
      return apiFetch(endpoint, {
        method: action.method ?? "POST",
        token: token ?? undefined,
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["insights"] });
      void qc.invalidateQueries({ queryKey: ["home-insights"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
      onActionDone?.();
    },
  });

  const dismissMut = useMutation({
    mutationFn: () =>
      apiFetch("/leads/metrics/insights/dismiss", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ insightId }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["insights"] });
      void qc.invalidateQueries({ queryKey: ["home-insights"] });
      onActionDone?.();
    },
  });

  return (
    <div className={compact ? "flex flex-wrap gap-1.5" : "mt-3 flex flex-wrap items-center gap-2"}>
      {actions.map((action) =>
        action.type === "link" && action.href ? (
          <Button
            key={action.label}
            asChild
            size="sm"
            variant={compact ? "outline" : "default"}
            className={compact ? "h-7 text-[10px]" : "h-8"}
          >
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : canEdit && action.type === "api" && action.endpoint ? (
          <Button
            key={action.label}
            type="button"
            size="sm"
            variant="outline"
            className={compact ? "h-7 text-[10px]" : "h-8"}
            disabled={apiMut.isPending}
            onClick={() => apiMut.mutate(action)}
          >
            {apiMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : action.label}
          </Button>
        ) : null,
      )}
      {canEdit && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={compact ? "h-7 px-2 text-[10px] text-muted-foreground" : "h-8 text-muted-foreground"}
          disabled={dismissMut.isPending}
          onClick={() => dismissMut.mutate()}
          title="Snooze for 7 days"
        >
          {dismissMut.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <X className="h-3 w-3" />
              {!compact && <span className="ml-1">Dismiss</span>}
            </>
          )}
        </Button>
      )}
      {apiMut.isError && (
        <p className="w-full text-xs text-destructive">
          {apiMut.error instanceof ApiError ? apiMut.error.message : "Action failed"}
        </p>
      )}
    </div>
  );
}
