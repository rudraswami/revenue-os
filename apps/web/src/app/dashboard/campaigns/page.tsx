"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  FileUp,
  Loader2,
  Megaphone,
  Send,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch, ApiError } from "@/lib/api-client";
import { canManageCampaigns } from "@/lib/permissions";
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
  deliveredCount: number;
  createdAt: string;
}

interface PreviewSample {
  id: string;
  displayName?: string | null;
  phone: string;
  stage: string;
  score: number;
}

interface CampaignDetail extends CampaignRow {
  messageBody?: string | null;
  audienceFilter?: {
    source?: string;
    languageCode?: string;
    templateParams?: string[];
    stages?: LeadStage[];
  };
  recipients: Array<{
    id: string;
    phone: string;
    name?: string | null;
    status: string;
    error?: string | null;
    sentAt?: string | null;
  }>;
}

type CreateMode = "audience" | "import";

function parseCsvRecipients(text: string): Array<{ phone: string; name?: string }> {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const first = lines[0].toLowerCase();
  const hasHeader = first.includes("phone");
  const start = hasHeader ? 1 : 0;
  const out: Array<{ phone: string; name?: string }> = [];

  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const phone = cols[0]?.replace(/\D/g, "");
    if (!phone || phone.length < 10) continue;
    out.push({ phone, name: cols[1] || undefined });
  }
  return out;
}

export default function CampaignsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canManage = canManageCampaigns(role);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<CreateMode>("audience");
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [languageCode, setLanguageCode] = useState("en");
  const [templateParam, setTemplateParam] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [minScore, setMinScore] = useState("");
  const [preview, setPreview] = useState<{ count: number; sample: PreviewSample[] } | null>(null);
  const [importRecipients, setImportRecipients] = useState<Array<{ phone: string; name?: string }>>(
    [],
  );
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
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

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["campaign", detailId],
    queryFn: () => apiFetch<CampaignDetail>(`/campaigns/${detailId}`, { token: token ?? undefined }),
    enabled: !!token && !!detailId,
  });

  function audience() {
    return {
      stages: stages.length ? stages : undefined,
      tagIds: tagIds.length ? tagIds : undefined,
      minScore: minScore ? Number(minScore) : undefined,
    };
  }

  function templatePayload() {
    return {
      languageCode,
      templateParams: templateParam.trim() ? [templateParam.trim()] : [],
      messageBody: messageBody.trim() || undefined,
    };
  }

  function resetForm() {
    setName("");
    setTemplateName("");
    setLanguageCode("en");
    setTemplateParam("");
    setMessageBody("");
    setStages([]);
    setTagIds([]);
    setMinScore("");
    setPreview(null);
    setImportRecipients([]);
    setImportFileName(null);
    setError(null);
  }

  const previewMut = useMutation({
    mutationFn: () =>
      apiFetch<{ count: number; sample: PreviewSample[] }>("/campaigns/preview", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ audience: audience() }),
      }),
    onSuccess: (data) => setPreview(data),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Could not preview audience"),
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
          ...templatePayload(),
        }),
      }),
    onSuccess: () => {
      resetForm();
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not create campaign"),
  });

  const importMut = useMutation({
    mutationFn: () =>
      apiFetch("/campaigns/import", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          name: name.trim(),
          templateName: templateName.trim(),
          recipients: importRecipients,
          ...templatePayload(),
        }),
      }),
    onSuccess: () => {
      resetForm();
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not import campaign"),
  });

  const sendMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/campaigns/${id}/send`, { method: "POST", token: token ?? undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
      if (detailId) void qc.invalidateQueries({ queryKey: ["campaign", detailId] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Could not send campaign"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/campaigns/${id}`, { method: "DELETE", token: token ?? undefined }),
    onSuccess: () => {
      setDetailId(null);
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  function toggleStage(s: LeadStage) {
    setStages((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    setPreview(null);
  }

  function toggleTag(id: string) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setPreview(null);
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsvRecipients(text);
      setImportRecipients(parsed);
      setImportFileName(`${file.name} (${parsed.length} contacts)`);
      setError(parsed.length === 0 ? "No valid phone numbers found in CSV." : null);
    };
    reader.readAsText(file);
  }

  const canSubmitAudience =
    canManage && name.trim() && (preview?.count ?? 0) > 0 && !createMut.isPending;
  const canSubmitImport =
    canManage &&
    name.trim() &&
    templateName.trim() &&
    importRecipients.length > 0 &&
    !importMut.isPending;

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="Outbound"
        title="Campaigns"
        description="Reach segments of your WhatsApp contacts with approved message templates."
      />

      {!canManage && (
        <div className="mb-6 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          You have view-only access. Ask an admin or manager to create and send campaigns.
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
        <strong className="font-semibold">Meta policy:</strong> Business-initiated outbound
        messages must use a <strong>pre-approved WhatsApp template</strong> from your WhatsApp
        Manager. Growvisi sends only approved templates to contacts you choose.
      </div>

      {canManage && (
        <DashboardPanel className="mb-6" title="New campaign" description="Build from your CRM audience or import a CSV list.">
          <div className="mb-4 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "audience" ? "default" : "outline"}
              onClick={() => {
                setMode("audience");
                setError(null);
              }}
            >
              <Users className="h-4 w-4" /> From audience
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "import" ? "default" : "outline"}
              onClick={() => {
                setMode("import");
                setError(null);
              }}
            >
              <FileUp className="h-4 w-4" /> Import CSV
            </Button>
          </div>

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
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Language code">
                  <Input
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                    placeholder="en"
                    className="h-10 text-sm"
                  />
                </Field>
                <Field label="Template variable {{1}}">
                  <Input
                    value={templateParam}
                    onChange={(e) => setTemplateParam(e.target.value)}
                    placeholder="Customer name or offer"
                    className="h-10 text-sm"
                  />
                </Field>
              </div>
              <Field label="Fallback message body (optional)">
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Used as template body param when no explicit variables are set."
                  className="min-h-[72px] w-full rounded-xl border border-border px-3 py-2 text-sm"
                />
              </Field>
            </div>

            {mode === "audience" ? (
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

                {preview && preview.sample.length > 0 && (
                  <div className="rounded-xl border border-border/80 bg-[#f8f9ff] p-3">
                    <p className="text-xs font-semibold text-foreground">
                      Sample contacts ({preview.count} total)
                    </p>
                    <ul className="mt-2 space-y-1">
                      {preview.sample.map((s) => (
                        <li key={s.id} className="flex justify-between text-xs text-muted-foreground">
                          <span>{s.displayName || s.phone}</span>
                          <span>{STAGE_LABELS[s.stage as LeadStage] ?? s.stage}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Field label="CSV file (phone, name)">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCsvFile(f);
                    }}
                  />
                  <div
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-[#f8f9ff] px-4 py-8 text-center transition hover:border-accent/50"
                    onClick={() => fileRef.current?.click()}
                    onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                    role="button"
                    tabIndex={0}
                  >
                    <Upload className="mb-2 h-8 w-8 text-accent" />
                    <p className="text-sm font-semibold">Drop or click to upload CSV</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Columns: phone, name (optional). Header row supported.
                    </p>
                    {importFileName && (
                      <p className="mt-2 text-xs font-medium text-accent">{importFileName}</p>
                    )}
                  </div>
                </Field>
                {importRecipients.length > 0 && (
                  <div className="rounded-xl border border-border/80 bg-white p-3">
                    <p className="text-xs font-semibold">First 5 rows</p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {importRecipients.slice(0, 5).map((r, i) => (
                        <li key={i}>
                          {r.phone}
                          {r.name ? ` · ${r.name}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
            {mode === "audience" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => previewMut.mutate()}
                  disabled={previewMut.isPending}
                >
                  {previewMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  Preview audience
                </Button>
                {preview && (
                  <span className="text-sm font-semibold text-foreground">
                    {preview.count} contact{preview.count === 1 ? "" : "s"} match
                  </span>
                )}
              </>
            )}
            <div className="flex-1" />
            {mode === "audience" ? (
              <Button size="sm" onClick={() => createMut.mutate()} disabled={!canSubmitAudience}>
                {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save campaign
              </Button>
            ) : (
              <Button size="sm" onClick={() => importMut.mutate()} disabled={!canSubmitImport}>
                {importMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Import & save
              </Button>
            )}
          </div>
        </DashboardPanel>
      )}

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
              <li key={c.id}>
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left transition hover:bg-muted/30"
                  onClick={() => setDetailId(c.id)}
                >
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
                      {c.templateName ? ` · ${c.templateName}` : " · no template"}
                      {` · ${formatDate(c.createdAt)}`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DashboardPanel>

      {detailId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="flex h-full w-full max-w-lg flex-col border-l border-border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                  Campaign detail
                </p>
                <h2 className="text-lg font-bold">{detail?.name ?? "Loading…"}</h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {detailLoading || !detail ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Status" value={detail.status} />
                    <Stat label="Recipients" value={String(detail.totalRecipients)} />
                    <Stat label="Sent" value={String(detail.sentCount)} />
                    <Stat label="Failed" value={String(detail.failedCount)} />
                  </div>
                  {detail.templateName && (
                    <p className="mb-4 text-xs text-muted-foreground">
                      Template: <strong>{detail.templateName}</strong>
                      {detail.audienceFilter?.languageCode
                        ? ` · ${detail.audienceFilter.languageCode}`
                        : ""}
                    </p>
                  )}

                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recipients
                  </p>
                  <ul className="divide-y divide-border/60 rounded-xl border border-border/80">
                    {detail.recipients.map((r) => (
                      <li key={r.id} className="px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {r.name || r.phone}
                            </p>
                            {r.name && (
                              <p className="text-xs text-muted-foreground">{r.phone}</p>
                            )}
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              r.status === "SENT" || r.status === "DELIVERED"
                                ? "bg-bento-mint text-accent"
                                : r.status === "FAILED"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {r.status}
                          </span>
                        </div>
                        {r.error && (
                          <p className="mt-1 text-xs text-destructive">{r.error}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {detail && canManage && (
              <div className="flex gap-2 border-t border-border p-4">
                {(detail.status === "DRAFT" || detail.status === "FAILED") && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setError(null);
                      sendMut.mutate(detail.id);
                    }}
                    disabled={sendMut.isPending}
                  >
                    {sendMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send campaign
                  </Button>
                )}
                {detail.status !== "RUNNING" && (
                  <Button
                    variant="outline"
                    onClick={() => deleteMut.mutate(detail.id)}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-[#f8f9ff] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
