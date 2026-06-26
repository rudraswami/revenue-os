"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Sun } from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { canManageTeam } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";

const DIGEST_HOURS = [
  { value: 6, label: "6:00 AM IST" },
  { value: 7, label: "7:00 AM IST" },
  { value: 8, label: "8:00 AM IST" },
  { value: 9, label: "9:00 AM IST" },
  { value: 10, label: "10:00 AM IST" },
];

export function DailyDigestCard() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const isAdmin = canManageTeam(role);
  const qc = useQueryClient();

  const { data: ops, isLoading } = useQuery({
    queryKey: ["ops-settings"],
    queryFn: () =>
      apiFetch<{
        digest: { enabled: boolean; hourIst: number; lastSentDate?: string | null };
      }>("/organizations/ops-settings", { token: token ?? undefined }),
    enabled: !!token,
  });

  const mutation = useMutation({
    mutationFn: (patch: { digest?: { enabled?: boolean; hourIst?: number } }) =>
      apiFetch("/organizations/ops-settings", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(patch),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["ops-settings"] }),
  });

  if (isLoading || !ops) {
    return (
      <DashboardPanel title="Daily revenue digest">
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      </DashboardPanel>
    );
  }

  return (
    <DashboardPanel
      noPadding
      className="overflow-hidden border-[#dce9ff]"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-bento-mint text-amber-700">
            <Sun className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">Daily revenue digest</h3>
              {ops.digest.enabled && (
                <span className="rounded-full bg-bento-mint px-2 py-0.5 text-[9px] font-bold uppercase text-accent">
                  On
                </span>
              )}
            </div>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Every morning, owners and admins get an email with pipeline value (₹), hot leads,
              handoffs, unread messages, and team workload — so you know what to do before opening
              WhatsApp.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              Sent to workspace owners & admins only
              {ops.digest.lastSentDate ? ` · Last sent ${ops.digest.lastSentDate}` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-white px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Email digest</span>
            <Switch
              checked={ops.digest.enabled}
              disabled={!isAdmin || mutation.isPending}
              onCheckedChange={(enabled) => mutation.mutate({ digest: { enabled } })}
            />
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Send at
              </label>
              <Select
                value={String(ops.digest.hourIst)}
                onChange={(e) =>
                  mutation.mutate({ digest: { hourIst: Number(e.target.value) } })
                }
                className="h-8 w-36 text-xs"
                disabled={mutation.isPending || !ops.digest.enabled}
              >
                {DIGEST_HOURS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </Select>
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          )}
          {!isAdmin && (
            <p className="text-[11px] text-muted-foreground">Ask an admin to change digest settings.</p>
          )}
        </div>
      </div>
    </DashboardPanel>
  );
}
