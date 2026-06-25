"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Send, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import {
  CAMPAIGN_STATUS_BADGE,
  formatDate,
  LEAD_STAGES,
  readableOn,
  STAGE_LABELS,
  type CampaignStatus,
  type CrmTag,
} from "@/lib/crm";
import type { LeadStage } from "@growvisi/shared";
import { cn } from "@/lib/utils";

interface CampaignRow {
  id: string;
  name: string;
  status: CampaignStatus;
  templateName?: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

export default function CampaignsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [minScore, setMinScore] = useState("");
  const [preview, setPreview] = useState<{ count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => apiFetch<CampaignRow[]>("/campaigns", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiFetch<CrmTag[]>("/tags", { token: token ?? undefined }),
    enabled: !!token,
  });

  function audience() {
    return {
      stages: stages.length ? stages : undefined,
      tagIds: tagIds.length ? tagIds : undefined,
      minScore: minScore ? Number(minScore) : undefined,
    };
  }

  const previewMut = useMutation({
    mutationFn: () =>
      apiFetch<{ count: number }>("/campaigns/preview", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ audience: audience() }),
      }),
    onSuccess: (data) => setPreview(data),
  });

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch("/campaigns", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          name: name.trim(),
          templateName: templateName.trim() || undefined,
          audience: audience(),
        }),
      }),
    onSuccess: () => {
      setName("");
      setTemplateName("");
      setStages([]);
      setTagIds([]);
      setMinScore("");
      setPreview(null);
      setError(null);
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not create campaign"),
  });

  const sendMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/campaigns/${id}/send`, { method: "POST", token: token ?? undefined }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["campaigns"] }),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Could not send campaign"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/campaigns/${id}`, { method: "DELETE", token: token ?? undefined }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  function toggleStage(s: LeadStage) {
    setStages((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    setPreview(null);
  }
  function toggleTag(id: string) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setPreview(null);
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Outbound"
        title="Campaigns"
        description="Reach segments of your WhatsApp contacts with approved message templates."
      />

      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
        <strong className="font-semibold">Meta policy:</strong> Business-initiated outbound
        messages must use a <strong>pre-approved WhatsApp template</strong> from your WhatsApp
        Manager. Growvisi never spams customers — it sends only approved templates to contacts you
        choose.
      </div>

      <DashboardPanel className="mb-6" title="New campaign" description="Build an audience from your contacts.">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Campaign name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Diwali offer — qualified leads"
                className="h-10 text-sm"
              />
            </Field>
            <Field label="Approved template name">
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. seasonal_offer_v1"
                className="h-10 text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Must match a template approved in WhatsApp Manager.
              </p>
            </Field>
          </div>

          <div className="space-y-4">
            <Field label="Stages">
              <div className="flex flex-wrap gap-1.5">
                {LEAD_STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStage(s)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                      stages.includes(s)
                        ? "bg-accent text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/70",
                    )}
                  >
                    {STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            </Field>
            {(tags ?? []).length > 0 && (
              <Field label="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {(tags ?? []).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.id)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                        tagIds.includes(t.id) ? "ring-2 ring-foreground" : "opacity-80",
                      )}
                      style={{ backgroundColor: t.color, color: readableOn(t.color) }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </Field>
            )}
            <Field label="Minimum lead score">
              <Input
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => {
                  setMinScore(e.target.value);
                  setPreview(null);
                }}
                placeholder="Any"
                className="h-10 w-32 text-sm"
              />
            </Field>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
          <Button variant="outline" size="sm" onClick={() => previewMut.mutate()} disabled={previewMut.isPending}>
            <Users className="h-4 w-4" /> Preview audience
          </Button>
          {preview && (
            <span className="text-sm font-semibold text-foreground">
              {preview.count} contact{preview.count === 1 ? "" : "s"} match
            </span>
          )}
          <div className="flex-1" />
          <Button size="sm" onClick={() => createMut.mutate()} disabled={!name.trim() || createMut.isPending}>
            Save campaign
          </Button>
        </div>
      </DashboardPanel>

      <DashboardPanel noPadding title="Your campaigns">
        {isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (campaigns?.length ?? 0) === 0 ? (
          <EmptyState
            compact
            icon={<Megaphone className="h-6 w-6" />}
            title="No campaigns yet"
            description="Create your first broadcast above to re-engage a segment of contacts."
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {campaigns!.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-foreground">{c.name}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        CAMPAIGN_STATUS_BADGE[c.status],
                      )}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.totalRecipients} recipients
                    {c.sentCount > 0 && ` · ${c.sentCount} sent`}
                    {c.failedCount > 0 && ` · ${c.failedCount} failed`}
                    {c.templateName ? ` · template: ${c.templateName}` : " · no template"}
                    {` · ${formatDate(c.createdAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(c.status === "DRAFT" || c.status === "FAILED") && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setError(null);
                        sendMut.mutate(c.id);
                      }}
                      disabled={sendMut.isPending}
                    >
                      <Send className="h-3.5 w-3.5" /> Send
                    </Button>
                  )}
                  {c.status !== "RUNNING" && (
                    <button
                      type="button"
                      onClick={() => deleteMut.mutate(c.id)}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardPanel>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
