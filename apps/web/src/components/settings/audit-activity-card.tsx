"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface AuditLogRow {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string } | null;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  EXPORT: "Exported",
  SETTINGS_CHANGE: "Changed settings",
};

function describeEntry(row: AuditLogRow): string {
  const verb = ACTION_LABELS[row.action] ?? row.action.toLowerCase();
  const resource = row.resource.replace(/_/g, " ");
  const who = row.user?.name ?? row.user?.email ?? "System";
  return `${who} ${verb.toLowerCase()} ${resource}`;
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function AuditActivityCard() {
  const token = useAuthStore((s) => s.accessToken);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => apiFetch<AuditLogRow[]>("/audit/logs?limit=40", { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-muted/30 px-4 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading activity…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Activity log is available to workspace admins on Growth plan and above.
      </p>
    );
  }

  if (!data?.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        No activity recorded yet. Team changes, exports, and settings updates appear here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/80">
      <ul className="divide-y divide-border/60">
        {data.map((row) => (
          <li key={row.id} className="flex items-start gap-3 px-4 py-3 text-sm">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f8f9ff] text-accent">
              <ClipboardList className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{describeEntry(row)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {timeAgo(row.createdAt)}
                {row.resourceId ? ` · ${row.resourceId.slice(0, 8)}…` : ""}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                row.action === "DELETE"
                  ? "bg-red-50 text-red-700"
                  : row.action === "CREATE"
                    ? "bg-[#ecfdf5] text-[#128C7E]"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {ACTION_LABELS[row.action] ?? row.action}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
