"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { MessageTemplateStarter, MessageTemplateView } from "@growvisi/shared";
import {
  canDeleteTemplate,
  canEditTemplateBody,
  defaultTemplateNameFromStarter,
  sanitizeTemplateName,
  starterById,
  templateEditActionLabel,
  templateEditHint,
  validateTemplateBody,
} from "@growvisi/shared";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/components/ui/toast";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { TemplatePreviewBubble } from "@/components/dashboard/template-preview-bubble";
import { TemplateStatusBadge, isTemplateSendable } from "./template-status-badge";
import { TemplateEditPanel } from "./template-edit-panel";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "approved" | "pending" | "rejected";

type TemplatesResponse = {
  templates: MessageTemplateView[];
  syncedAt: string;
  counts: { total: number; approved: number; pending: number; rejected: number };
};

type StartersResponse = { starters: MessageTemplateStarter[] };

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending" },
  { id: "rejected", label: "Rejected" },
];

export function TemplateManagementView() {
  const token = useAuthStore((s) => s.accessToken);
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedStarterId, setSelectedStarterId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("UTILITY");
  const [language, setLanguage] = useState("en");
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplateView | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editCategory, setEditCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("UTILITY");
  const [deleteTarget, setDeleteTarget] = useState<MessageTemplateView | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["message-templates", filter],
    queryFn: () =>
      apiFetch<TemplatesResponse>(`/message-templates?status=${filter}`, {
        token: token ?? undefined,
      }),
    enabled: !!token,
    staleTime: 60_000,
    refetchInterval: (query) => {
      const pending = query.state.data?.counts?.pending ?? 0;
      return pending > 0 ? 60_000 : false;
    },
  });

  const { data: startersData } = useQuery({
    queryKey: ["message-template-starters"],
    queryFn: () =>
      apiFetch<StartersResponse>("/message-templates/starters", {
        token: token ?? undefined,
      }),
    enabled: !!token && createOpen,
    staleTime: 24 * 60 * 60_000,
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; approvedTemplateCount?: number }>("/message-templates/sync", {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      success("Templates synced from WhatsApp");
    },
    onError: (err: Error) => toastError(err.message),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ template: MessageTemplateView; message: string }>("/message-templates", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({
          name: sanitizeTemplateName(name),
          body: body.trim(),
          category,
          language,
          starterId: selectedStarterId ?? undefined,
        }),
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      setCreateOpen(false);
      setSelectedStarterId(null);
      success(res.message);
    },
    onError: (err: Error) => toastError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingTemplate?.metaTemplateId) {
        throw new Error("Missing Meta template ID. Sync from Meta and try again.");
      }
      return apiFetch<{ template: MessageTemplateView; message: string }>("/message-templates/edit", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify({
          name: editingTemplate.name,
          language: editingTemplate.language,
          metaTemplateId: editingTemplate.metaTemplateId,
          body: editBody.trim(),
          category: editCategory,
        }),
      });
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      setEditingTemplate(null);
      success(res.message);
    },
    onError: (err: Error) => toastError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (target: MessageTemplateView) =>
      apiFetch<{ ok: boolean; message: string }>(
        `/message-templates?name=${encodeURIComponent(target.name)}&language=${encodeURIComponent(target.language)}${target.metaTemplateId ? `&metaTemplateId=${encodeURIComponent(target.metaTemplateId)}` : ""}`,
        {
          method: "DELETE",
          token: token ?? undefined,
        },
      ),
    onSuccess: (res, target) => {
      void queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      setDeleteTarget(null);
      if (editingTemplate?.name === target.name && editingTemplate.language === target.language) {
        setEditingTemplate(null);
      }
      success(res.message);
    },
    onError: (err: Error) => toastError(err.message),
  });

  const starters = startersData?.starters ?? [];
  const selectedStarter = selectedStarterId ? starterById(selectedStarterId) : undefined;

  const previewParams = useMemo(() => {
    if (!selectedStarter) return [];
    return selectedStarter.variableHints.map((h) => `[${h}]`);
  }, [selectedStarter]);

  const bodyValidation = body.trim() ? validateTemplateBody(body) : null;

  function openCreate(starter?: MessageTemplateStarter) {
    if (starter) {
      setSelectedStarterId(starter.id);
      setName(defaultTemplateNameFromStarter(starter.id));
      setBody(starter.body);
      setCategory(starter.category);
      setLanguage(starter.language);
    } else {
      setSelectedStarterId(null);
      setName("");
      setBody("");
      setCategory("UTILITY");
      setLanguage("en");
    }
    setCreateOpen(true);
  }

  function openEdit(template: MessageTemplateView) {
    setCreateOpen(false);
    setEditingTemplate(template);
    setEditBody(template.bodyText || template.bodyPreview);
    setEditCategory(
      (template.category as "MARKETING" | "UTILITY" | "AUTHENTICATION") ?? "UTILITY",
    );
  }

  const counts = data?.counts;

  return (
    <div className="dashboard-page space-y-6 px-4 py-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Automate</p>
          <h1 className="mt-1 font-sans text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Message templates
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Create and submit WhatsApp templates on your business number. Meta reviews every
            template — approval usually takes 15 minutes to 24 hours. Approved templates power{" "}
            <Link href="/dashboard/campaigns" className="font-medium text-accent hover:underline">
              Campaigns
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={syncMutation.isPending || isFetching}
            onClick={() => syncMutation.mutate()}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", (syncMutation.isPending || isFetching) && "animate-spin")}
            />
            Sync from Meta
          </Button>
          <Button type="button" className="rounded-xl" onClick={() => openCreate()}>
            <Plus className="mr-2 h-4 w-4" />
            New template
          </Button>
        </div>
      </header>

      {counts && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: counts.total, icon: FileText },
            { label: "Approved", value: counts.approved, icon: CheckCircle2 },
            { label: "Pending", value: counts.pending, icon: Clock },
            { label: "Rejected", value: counts.rejected, icon: AlertCircle },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border/80 bg-card px-4 py-3 elev-1"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <stat.icon className="h-3.5 w-3.5" />
                {stat.label}
              </div>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {counts && counts.pending > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">
              {counts.pending} template{counts.pending > 1 ? "s" : ""} awaiting Meta review
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Approval usually takes 15 minutes to 24 hours. This page refreshes automatically — or
              tap Sync from Meta after you get the WhatsApp approval email.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              filter === f.id
                ? "bg-accent text-white"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {editingTemplate && (
        <TemplateEditPanel
          template={editingTemplate}
          body={editBody}
          category={editCategory}
          onBodyChange={setEditBody}
          onCategoryChange={setEditCategory}
          onCancel={() => setEditingTemplate(null)}
          onSubmit={() => updateMutation.mutate()}
          isPending={updateMutation.isPending}
        />
      )}

      {createOpen && (
        <section className="overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-bento-mint/40 via-card to-card elev-1">
          <div className="border-b border-border/60 px-5 py-4">
            <h2 className="text-lg font-bold text-foreground">Create template</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a starter or write from scratch. We submit to Meta on your WhatsApp number.
            </p>
          </div>
          <div className="grid gap-6 p-5 lg:grid-cols-2">
            <div className="space-y-4">
              {!selectedStarterId && starters.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Starters
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {starters.slice(0, 4).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => openCreate(s)}
                        className="rounded-xl border border-border/80 bg-card p-3 text-left transition hover:border-accent/40 hover:bg-bento-mint/30"
                      >
                        <p className="text-sm font-semibold text-foreground">{s.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {s.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Template name</span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="followup_offer_v1"
                  className="h-10 font-mono text-sm"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Category</span>
                  <Select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as "MARKETING" | "UTILITY" | "AUTHENTICATION")
                    }
                    className="h-10 text-sm"
                  >
                    <option value="UTILITY">Utility (faster approval)</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="AUTHENTICATION">Authentication</option>
                  </Select>
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Language</span>
                  <Select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="h-10 text-sm"
                  >
                    <option value="en">English</option>
                    <option value="en_IN">English (India)</option>
                    <option value="hi">Hindi</option>
                  </Select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Message body</span>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  className="text-sm"
                  placeholder="Hi {{1}}, thanks for contacting {{2}}…"
                />
                {bodyValidation && !bodyValidation.ok && (
                  <p className="text-xs text-destructive">{bodyValidation.error}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Use {"{{1}}"}, {"{{2}}"} for variables. UTILITY templates approve faster than
                  MARKETING.
                </p>
              </label>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={
                    createMutation.isPending ||
                    !name.trim() ||
                    !body.trim() ||
                    (bodyValidation !== null && !bodyValidation.ok)
                  }
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? (
                    <GrowvisiSpinner size="sm" className="mr-2" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Submit to WhatsApp
                </Button>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>

            <TemplatePreviewBubble body={body} params={previewParams} />
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-border/80 bg-card elev-1">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-muted-foreground">
            <GrowvisiSpinner size="sm" />
            Loading templates from WhatsApp…
          </div>
        ) : isError ? (
          <div className="space-y-3 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">Couldn&apos;t load templates</p>
            <p className="text-xs text-muted-foreground">
              Check WhatsApp connection and token in Settings.
            </p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : (data?.templates.length ?? 0) === 0 ? (
          <div className="space-y-4 px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-bento-mint text-accent">
              <Megaphone className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No templates yet</h3>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Create your first template here — we&apos;ll submit it to Meta on your number. Once
              approved, use it in Campaigns to reach your pipeline.
            </p>
            <Button onClick={() => openCreate()} className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Create first template
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {data?.templates.map((t) => (
              <li
                key={`${t.name}-${t.language}`}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-semibold text-foreground">{t.name}</p>
                    <TemplateStatusBadge status={t.status} />
                    {t.category && (
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">
                        {t.category.toLowerCase()}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{t.language}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t.bodyPreview || t.bodyText}
                  </p>
                  {t.rejectedReason && (
                    <p className="mt-2 text-xs text-destructive">Reason: {t.rejectedReason}</p>
                  )}
                  {!canEditTemplateBody(t.status) && templateEditHint(t.status) && (
                    <p className="mt-2 text-xs text-muted-foreground">{templateEditHint(t.status)}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {canEditTemplateBody(t.status) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => openEdit(t)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      {templateEditActionLabel(t.status)}
                    </Button>
                  )}
                  {isTemplateSendable(t.status) && (
                    <Button asChild variant="outline" size="sm" className="rounded-xl">
                      <Link
                        href={`/dashboard/campaigns?template=${encodeURIComponent(t.name)}&lang=${encodeURIComponent(t.language)}&create=1`}
                      >
                        Use in campaign
                      </Link>
                    </Button>
                  )}
                  {canDeleteTemplate(t.status) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data?.syncedAt && (
        <p className="text-center text-xs text-muted-foreground">
          Last synced {new Date(data.syncedAt).toLocaleString("en-IN")}
        </p>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={
          deleteTarget?.status === "APPROVED"
            ? "Delete approved template?"
            : "Delete this template?"
        }
        description={
          deleteTarget?.status === "APPROVED" ? (
            <>
              <strong>{deleteTarget.name}</strong> ({deleteTarget.language}) will be removed from
              WhatsApp. Active campaigns using this template may fail. Meta blocks reusing the same
              name for 30 days.
            </>
          ) : (
            <>
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.language}) will be removed from
              your WhatsApp number.
            </>
          )
        }
        confirmLabel="Delete template"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      />
    </div>
  );
}
