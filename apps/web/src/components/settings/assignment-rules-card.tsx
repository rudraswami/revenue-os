"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api-client";
import { LEAD_STAGES, STAGE_LABELS } from "@/lib/crm";
import { canManageTeam } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import type { LeadStage } from "@growvisi/shared";

interface AssignmentRule {
  id: string;
  enabled: boolean;
  name: string;
  conditions: {
    stages?: LeadStage[];
    minScore?: number;
    handoffOnly?: boolean;
  };
  strategy: "round_robin" | "fixed_user";
  userId?: string;
  poolUserIds?: string[];
}

interface AssignmentRulesConfig {
  defaultStrategy: "round_robin" | "unassigned";
  defaultPoolUserIds: string[];
  applyOnNewConversation: boolean;
  applyOnHandoff: boolean;
  rules: AssignmentRule[];
}

interface MemberRow {
  user: { id: string; name: string | null; email: string };
  role: string;
}

export function AssignmentRulesCard({ embedded = false }: { embedded?: boolean }) {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const isAdmin = canManageTeam(role);
  const qc = useQueryClient();
  const [draftRules, setDraftRules] = useState<AssignmentRule[] | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["assignment-rules"],
    queryFn: () =>
      apiFetch<AssignmentRulesConfig>("/organizations/assignment-rules", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const { data: members } = useQuery({
    queryKey: ["organization-members"],
    queryFn: () => apiFetch<MemberRow[]>("/organizations/members", { token: token ?? undefined }),
    enabled: !!token,
  });

  const agents = (members ?? []).filter((m) => m.role !== "VIEWER");

  const mutation = useMutation({
    mutationFn: (patch: Partial<AssignmentRulesConfig>) =>
      apiFetch("/organizations/assignment-rules", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      setDraftRules(null);
      void qc.invalidateQueries({ queryKey: ["assignment-rules"] });
    },
  });

  const rules = draftRules ?? config?.rules ?? [];
  const poolIds = config?.defaultPoolUserIds ?? [];

  function updateDraft(next: AssignmentRule[]) {
    setDraftRules(next);
  }

  function saveRules(next: AssignmentRule[]) {
    mutation.mutate({ rules: next });
  }

  function togglePoolUser(userId: string) {
    if (!config || !isAdmin) return;
    const next = poolIds.includes(userId)
      ? poolIds.filter((id) => id !== userId)
      : [...poolIds, userId];
    mutation.mutate({ defaultPoolUserIds: next });
  }

  function addRule() {
    const next: AssignmentRule = {
      id: `rule_${Date.now()}`,
      enabled: true,
      name: "New rule",
      conditions: { handoffOnly: false },
      strategy: "round_robin",
      poolUserIds: [],
    };
    updateDraft([...rules, next]);
  }

  if (isLoading || !config) {
    return <div className="h-24 animate-pulse rounded-xl bg-muted" />;
  }

  const body = (
    <div className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={config.applyOnNewConversation}
              disabled={!isAdmin || mutation.isPending}
              onCheckedChange={(applyOnNewConversation) =>
                mutation.mutate({ applyOnNewConversation })
              }
            />
            New conversations
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={config.applyOnHandoff}
              disabled={!isAdmin || mutation.isPending}
              onCheckedChange={(applyOnHandoff) => mutation.mutate({ applyOnHandoff })}
            />
            AI handoffs
          </label>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Default agent pool
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {agents.map((m) => (
              <button
                key={m.user.id}
                type="button"
                disabled={!isAdmin || mutation.isPending}
                onClick={() => togglePoolUser(m.user.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  poolIds.includes(m.user.id)
                    ? "bg-accent text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {m.user.name || m.user.email.split("@")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {rules.map((rule, idx) => (
            <div key={rule.id} className="rounded-xl border border-border/80 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Switch
                  checked={rule.enabled}
                  disabled={!isAdmin}
                  onCheckedChange={(enabled) => {
                    const next = [...rules];
                    next[idx] = { ...rule, enabled };
                    updateDraft(next);
                  }}
                />
                <Input
                  value={rule.name}
                  onChange={(e) => {
                    const next = [...rules];
                    next[idx] = { ...rule, name: e.target.value };
                    updateDraft(next);
                  }}
                  className="h-8 flex-1 min-w-[120px] text-xs"
                  disabled={!isAdmin}
                />
                <Select
                  value={rule.strategy}
                  onChange={(e) => {
                    const next = [...rules];
                    next[idx] = {
                      ...rule,
                      strategy: e.target.value as AssignmentRule["strategy"],
                    };
                    updateDraft(next);
                  }}
                  className="h-8 w-32 text-xs"
                  disabled={!isAdmin}
                >
                  <option value="round_robin">Round robin</option>
                  <option value="fixed_user">Fixed agent</option>
                </Select>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => updateDraft(rules.filter((_, i) => i !== idx))}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {LEAD_STAGES.map((stage) => {
                  const active = rule.conditions.stages?.includes(stage);
                  return (
                    <button
                      key={stage}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => {
                        const stages = rule.conditions.stages ?? [];
                        const nextStages = active
                          ? stages.filter((s) => s !== stage)
                          : [...stages, stage];
                        const next = [...rules];
                        next[idx] = {
                          ...rule,
                          conditions: { ...rule.conditions, stages: nextStages },
                        };
                        updateDraft(next);
                      }}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        active ? "bg-accent text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {STAGE_LABELS[stage]}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => {
                    const next = [...rules];
                    next[idx] = {
                      ...rule,
                      conditions: {
                        ...rule.conditions,
                        handoffOnly: !rule.conditions.handoffOnly,
                      },
                    };
                    updateDraft(next);
                  }}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    rule.conditions.handoffOnly
                      ? "bg-amber-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  Handoff only
                </button>
              </div>

              {rule.strategy === "fixed_user" && (
                <Select
                  value={rule.userId ?? ""}
                  onChange={(e) => {
                    const next = [...rules];
                    next[idx] = { ...rule, userId: e.target.value };
                    updateDraft(next);
                  }}
                  className="mt-2 h-8 w-full text-xs"
                  disabled={!isAdmin}
                >
                  <option value="">Select agent…</option>
                  {agents.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name || m.user.email}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          ))}
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={addRule}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add rule
            </Button>
            {draftRules && (
              <Button
                type="button"
                size="sm"
                onClick={() => saveRules(draftRules)}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Save rules
              </Button>
            )}
          </div>
        )}

        {!isAdmin && (
          <p className="text-[11px] text-muted-foreground">Ask an admin to change assignment rules.</p>
        )}
    </div>
  );

  if (embedded) return body;

  return (
    <div className="mt-6 border-t border-[#dce9ff] pt-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bento-blue text-blue-700">
          <GitBranch className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold">Assignment rules</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Auto-assign new conversations and AI handoffs to agents using round-robin or fixed
            owners. Unassigned threads stay in the inbox queue.
          </p>
        </div>
      </div>
      <div className="mt-4">{body}</div>
    </div>
  );
}
