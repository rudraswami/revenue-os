"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, MessageCircle, Sun } from "lucide-react";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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

type DigestChannel = "email" | "whatsapp" | "both";

export function DailyDigestCard() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const isAdmin = canManageTeam(role);
  const qc = useQueryClient();

  const { data: ops, isLoading } = useQuery({
    queryKey: ["ops-settings"],
    queryFn: () =>
      apiFetch<{
        digest: {
          enabled: boolean;
          hourIst: number;
          channel: DigestChannel;
          whatsappPhone?: string | null;
          whatsappTemplateName?: string | null;
          digestLocale?: "en" | "hi";
          lastSentDate?: string | null;
        };
      }>("/organizations/ops-settings", { token: token ?? undefined }),
    enabled: !!token,
  });

  const mutation = useMutation({
    mutationFn: (patch: {
      digest?: {
        enabled?: boolean;
        hourIst?: number;
        channel?: DigestChannel;
        whatsappPhone?: string | null;
        whatsappTemplateName?: string | null;
        digestLocale?: "en" | "hi";
      };
    }) =>
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

  const showWhatsappPhone =
    ops.digest.channel === "whatsapp" || ops.digest.channel === "both";

  return (
    <DashboardPanel noPadding className="overflow-hidden border-border">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
            <Sun className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">Daily revenue digest</h3>
              {ops.digest.enabled && (
                <span className="rounded-full bg-bento-mint px-2 py-0.5 text-xs font-bold uppercase text-accent">
                  On
                </span>
              )}
            </div>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              Every morning IST: pipeline ₹, hot leads, chats waiting on you, and unread messages — by email
              and/or WhatsApp so owners who skip inbox email still get the brief.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              Email goes to owners & admins
              {ops.digest.lastSentDate ? ` · Last sent ${ops.digest.lastSentDate}` : ""}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Morning digest</span>
            <Switch
              checked={ops.digest.enabled}
              disabled={!isAdmin || mutation.isPending}
              onCheckedChange={(enabled) => mutation.mutate({ digest: { enabled } })}
            />
          </div>

          {isAdmin && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Channel
                </label>
                <Select
                  value={ops.digest.channel ?? "email"}
                  onChange={(e) =>
                    mutation.mutate({
                      digest: { channel: e.target.value as DigestChannel },
                    })
                  }
                  className="h-8 w-36 text-xs"
                  disabled={mutation.isPending || !ops.digest.enabled}
                >
                  <option value="email">Email only</option>
                  <option value="whatsapp">WhatsApp only</option>
                  <option value="both">Email + WhatsApp</option>
                </Select>
              </div>

              {showWhatsappPhone && (
                <div className="w-full max-w-xs space-y-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <MessageCircle className="h-3 w-3" />
                    WhatsApp number
                  </label>
                  <Input
                    placeholder="10-digit mobile for digest"
                    defaultValue={ops.digest.whatsappPhone ?? ""}
                    className="h-8 text-xs"
                    disabled={mutation.isPending || !ops.digest.enabled}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (ops.digest.whatsappPhone ?? "")) {
                        mutation.mutate({ digest: { whatsappPhone: v || null } });
                      }
                    }}
                  />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Internal alert to you — not a customer auto-reply. Use a Meta-approved template
                    name for reliable delivery outside the 24h window.
                  </p>
                  <Input
                    placeholder="Template name (optional)"
                    defaultValue={ops.digest.whatsappTemplateName ?? ""}
                    className="mt-2 h-8 text-xs"
                    disabled={mutation.isPending || !ops.digest.enabled}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (ops.digest.whatsappTemplateName ?? "")) {
                        mutation.mutate({ digest: { whatsappTemplateName: v || null } });
                      }
                    }}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      Digest language
                    </label>
                    <Select
                      value={ops.digest.digestLocale ?? "en"}
                      onChange={(e) =>
                        mutation.mutate({
                          digest: { digestLocale: e.target.value as "en" | "hi" },
                        })
                      }
                      className="h-8 w-28 text-xs"
                      disabled={mutation.isPending || !ops.digest.enabled}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">
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
            </>
          )}
          {!isAdmin && (
            <p className="text-xs text-muted-foreground">Ask an admin to change digest settings.</p>
          )}
        </div>
      </div>
    </DashboardPanel>
  );
}
