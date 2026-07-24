"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/use-optimistic-mutation";
import {
  CalendarClock,
  Download,
  MessageCircleReply,
  Send,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { CampaignSubmitChecklist } from "@/components/dashboard/campaign-submit-checklist";
import type { CampaignSubmitChecklistItem } from "@/components/dashboard/campaign-submit-checklist";
import {
  CampaignModeToggle,
  CampaignWizardSection,
  CampaignWizardSteps,
  type CampaignWizardStep,
} from "@/components/dashboard/campaign-wizard-shell";
import { CampaignsHubStats } from "@/components/dashboard/campaigns-hub-stats";
import { CampaignsListSection } from "@/components/dashboard/campaigns-list-section";
import { CampaignsPlanGate } from "@/components/dashboard/campaigns-plan-gate";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  CampaignDeliveryFunnel,
  buildCampaignDeliveryStats,
} from "@/components/dashboard/campaign-delivery-funnel";
import { GrowvisiSpinner } from "@/components/ui/loading";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiError, apiDownload, toUserMessage } from "@/lib/api-client";
import { canManageCampaigns } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import {
  CAMPAIGN_STATUS_BADGE,
  CAMPAIGN_STATUS_LABELS,
  formatDate,
  formatDateTimeIst,
  LEAD_STAGES,
  readableOn,
  STAGE_LABELS,
  type CampaignStatus,
  type CrmTag,
} from "@/lib/crm";
import type { LeadStage } from "@growvisi/shared";
import { STATUS_TONE } from "@/lib/status-map";
import { cn } from "@/lib/utils";
import { FilterChip } from "@/components/ui/filter-chip";
import { WhatsappTemplatePicker } from "@/components/dashboard/whatsapp-template-picker";
import {
  CampaignSchedulePicker,
  defaultScheduleLocal,
  localDatetimeToIso,
  toDatetimeLocalValue,
  formatIstPreview,
  type CampaignSaveMode,
} from "@/components/dashboard/campaign-schedule-picker";
import { TemplatePreviewBubble } from "@/components/dashboard/template-preview-bubble";
import {
  TemplateParamFields,
  buildTemplateParamsPayload,
  resizeTemplateParams,
  templateParamsReady,
} from "@/components/dashboard/template-param-fields";
import { QUERY_KEYS, STALE } from "@/lib/query-config";
import { useShellBilling } from "@/hooks/use-shell-cached-query";
import { useShellBootstrapSettled } from "@/hooks/use-shell-bootstrap-settled";
import { useShellWhatsappAccounts } from "@/hooks/use-shell-data";

interface CampaignRow {
  id: string;
  name: string;
  status: CampaignStatus;
  templateName?: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  replyCount?: number;
  createdAt: string;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  deliveryPct?: number;
  replyRatePct?: number;
}

interface PreviewSample {
  id: string;
  displayName?: string | null;
  phone: string;
  stage: string;
  score: number;
}

interface CampaignDetail extends CampaignRow {
  whatsappAccountId?: string | null;
  messageBody?: string | null;
  scheduledAt?: string | null;
  readCount?: number;
  replyCount?: number;
  replyRatePct?: number;
  deliveryStats?: {
    pending: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    replied?: number;
    skipped?: number;
  };
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
    repliedAt?: string | null;
    conversationId?: string | null;
  }>;
  recipientsTruncated?: boolean;
}

type CreateMode = "audience" | "import";
type ListFilter = "all" | "draft" | "scheduled" | "sent";
type RecipientFilter = "all" | "pending" | "sent" | "delivered" | "read" | "failed" | "replied" | "skipped";

const CAMPAIGN_WA_ACCOUNT_KEY = "growvisi:campaign-whatsapp-account-id";

function parseCampaignsPlanOk(billing?: {
  planId: string;
  entitlements?: { hasAccess: boolean };
}) {
  return (
    billing?.entitlements?.hasAccess &&
    billing.planId !== "trial" &&
    billing.planId !== "starter"
  );
}

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
  const searchParams = useSearchParams();
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canManage = canManageCampaigns(role);
  const qc = useQueryClient();

  const shellSettled = useShellBootstrapSettled();

  const { data: billing } = useShellBilling<{
    planId: string;
    entitlements?: { hasAccess: boolean };
  }>();

  const billingReady = shellSettled && billing !== undefined;
  const campaignsPlanOk = billingReady ? parseCampaignsPlanOk(billing) : null;
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<CreateMode>("audience");
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [languageCode, setLanguageCode] = useState("en");
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [templateVarCount, setTemplateVarCount] = useState(0);
  const [messageBody, setMessageBody] = useState("");
  const [stages, setStages] = useState<LeadStage[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [minScore, setMinScore] = useState("");
  const [preview, setPreview] = useState<{
    count: number;
    sample: PreviewSample[];
    optOutCount?: number;
    sendableCount?: number;
  } | null>(null);
  const [importRecipients, setImportRecipients] = useState<Array<{ phone: string; name?: string }>>(
    [],
  );
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<CampaignSaveMode>("draft");
  const [scheduledLocal, setScheduledLocal] = useState(defaultScheduleLocal);
  const [listFilter, setListFilter] = useState<ListFilter>("all");
  const [detailScheduleLocal, setDetailScheduleLocal] = useState(defaultScheduleLocal);
  const [whatsappAccountId, setWhatsappAccountId] = useState<string>("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>("all");

  useEffect(() => {
    const campaignId = searchParams.get("campaign");
    if (campaignId) setDetailId(campaignId);
  }, [searchParams]);

  useEffect(() => {
    const template = searchParams.get("template")?.trim();
    const lang = searchParams.get("lang")?.trim();
    if (!template) return;
    setTemplateName(template);
    if (lang) setLanguageCode(lang);
    if (searchParams.get("create") === "1") {
      requestAnimationFrame(() => {
        document.getElementById("new-campaign")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [searchParams]);

  const { data: whatsappAccounts } = useShellWhatsappAccounts<
    Array<{ id: string; displayPhoneNumber: string; isActive: boolean }>
  >();

  const activeAccounts = (whatsappAccounts ?? []).filter((a) => a.isActive);

  useEffect(() => {
    if (activeAccounts.length === 0) return;
    const saved = localStorage.getItem(CAMPAIGN_WA_ACCOUNT_KEY);
    if (saved && activeAccounts.some((a) => a.id === saved)) {
      setWhatsappAccountId(saved);
    } else if (!whatsappAccountId && activeAccounts.length === 1) {
      setWhatsappAccountId(activeAccounts[0].id);
    }
  }, [activeAccounts, whatsappAccountId]);

  useEffect(() => {
    if (whatsappAccountId) {
      localStorage.setItem(CAMPAIGN_WA_ACCOUNT_KEY, whatsappAccountId);
    }
  }, [whatsappAccountId]);

  const { data: replyMetrics } = useQuery({
    queryKey: ["campaign-reply-metrics"],
    queryFn: () =>
      apiFetch<{ totalReplies: number; replyRatePct: number }>(
        "/campaigns/metrics/replies",
        { token: token ?? undefined },
      ),
    enabled: !!token && campaignsPlanOk === true,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const { data: campaigns, isLoading, isError, refetch } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => apiFetch<CampaignRow[]>("/campaigns", { token: token ?? undefined }),
    enabled: !!token && campaignsPlanOk === true,
    retry: false,
    placeholderData: (prev) => prev,
    refetchInterval: (query) => {
      const rows = query.state.data;
      return rows?.some((c) => c.status === "RUNNING") ? 3_000 : false;
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiFetch<CrmTag[]>("/tags", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["campaign", detailId],
    queryFn: () => apiFetch<CampaignDetail>(`/campaigns/${detailId}`, { token: token ?? undefined }),
    enabled: !!token && !!detailId && campaignsPlanOk === true,
    refetchInterval: (query) =>
      query.state.data?.status === "RUNNING" ? 3_000 : false,
  });

  interface CampaignProgress {
    status: CampaignStatus;
    totalRecipients: number;
    progressPct: number;
    deliveryPct: number;
    pending: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    attempted: number;
    deliveredOrRead: number;
  }

  const { data: progress } = useQuery({
    queryKey: ["campaign-progress", detailId],
    queryFn: () =>
      apiFetch<CampaignProgress>(`/campaigns/${detailId}/progress`, {
        token: token ?? undefined,
      }),
    enabled: !!token && !!detailId && campaignsPlanOk === true && detail?.status === "RUNNING",
    refetchInterval: 3_000,
  });

  useEffect(() => {
    setTemplateParams((prev) => resizeTemplateParams(templateVarCount, prev));
  }, [templateVarCount]);

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
      templateParams: buildTemplateParamsPayload(templateVarCount, templateParams),
      messageBody: messageBody.trim() || undefined,
    };
  }

  function schedulePayload() {
    if (saveMode !== "schedule" || !scheduledLocal) return {};
    return { scheduledAt: localDatetimeToIso(scheduledLocal) };
  }

  function resetForm() {
    setName("");
    setTemplateName("");
    setLanguageCode("en");
    setTemplateParams([]);
    setMessageBody("");
    setStages([]);
    setTagIds([]);
    setMinScore("");
    setPreview(null);
    setImportRecipients([]);
    setImportFileName(null);
    setError(null);
    setSaveMode("draft");
    setScheduledLocal(defaultScheduleLocal());
    setWhatsappAccountId("");
  }

  function accountPayload() {
    if (!whatsappAccountId) return {};
    return { whatsappAccountId };
  }

  const previewMut = useMutation({
    mutationFn: () =>
      apiFetch<{
        count: number;
        sample: PreviewSample[];
        optOutCount?: number;
        sendableCount?: number;
      }>("/campaigns/preview", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ audience: audience() }),
      }),
    onSuccess: (data) => setPreview(data),
    onError: (err) =>
      setError(toUserMessage(err, "Could not preview audience")),
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
          ...schedulePayload(),
          ...accountPayload(),
        }),
      }),
    onSuccess: () => {
      resetForm();
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (err) => setError(toUserMessage(err, "Could not create campaign")),
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
          ...schedulePayload(),
          ...accountPayload(),
        }),
      }),
    onSuccess: () => {
      resetForm();
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (err) => setError(toUserMessage(err, "Could not import campaign")),
  });

  const sendMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/campaigns/${id}/send`, { method: "POST", token: token ?? undefined }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
      if (detailId) {
        void qc.invalidateQueries({ queryKey: ["campaign", detailId] });
        void qc.invalidateQueries({ queryKey: ["campaign-progress", detailId] });
      }
    },
    onError: (err) =>
      setError(toUserMessage(err, "Could not start campaign send")),
  });

  const retryMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/campaigns/${id}/retry-failed`, {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
      if (detailId) {
        void qc.invalidateQueries({ queryKey: ["campaign", detailId] });
        void qc.invalidateQueries({ queryKey: ["campaign-progress", detailId] });
      }
    },
    onError: (err) =>
      setError(toUserMessage(err, "Could not retry failed recipients")),
  });

  const deleteMut = useOptimisticMutation({
    mutationFn: (id: string) =>
      apiFetch(`/campaigns/${id}`, { method: "DELETE", token: token ?? undefined }),
    optimisticUpdate: async (queryClient, id) => {
      setConfirmDeleteId(null);
      setDetailId(null);
      await queryClient.cancelQueries({ queryKey: ["campaigns"] });
      const previous = queryClient.getQueriesData<CampaignRow[]>({ queryKey: ["campaigns"] });
      for (const [key, list] of previous) {
        if (list) queryClient.setQueryData(key, list.filter((c) => c.id !== id));
      }
      return { previous };
    },
    rollback: (queryClient, context) =>
      context?.previous.forEach(([key, val]) => queryClient.setQueryData(key, val)),
    reconcile: (queryClient) => {
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
    errorMessage: (err) => toUserMessage(err, "Could not delete campaign."),
  });

  const scheduleMut = useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      apiFetch(`/campaigns/${id}/schedule`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ scheduledAt }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
      if (detailId) void qc.invalidateQueries({ queryKey: ["campaign", detailId] });
    },
    onError: (err) =>
      setError(toUserMessage(err, "Could not schedule campaign")),
  });

  const cancelScheduleMut = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/campaigns/${id}/cancel-schedule`, {
        method: "POST",
        token: token ?? undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
      if (detailId) void qc.invalidateQueries({ queryKey: ["campaign", detailId] });
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

  async function handleSaveAudience() {
    setError(null);
    if (!name.trim()) {
      setError("Add a campaign name.");
      return;
    }
    if (!templateName.trim()) {
      setError("Choose an approved template (or enter the name manually).");
      return;
    }
    if (saveMode === "schedule" && !scheduledLocal) {
      setError("Pick a schedule time.");
      return;
    }

    let previewData = preview;
    if (!previewData) {
      try {
        previewData = await previewMut.mutateAsync();
        setPreview(previewData);
      } catch {
        return;
      }
    }

    const sendable = previewData.sendableCount ?? previewData.count;
    if (sendable <= 0) {
      setError("No contacts match this audience. Adjust filters or add contacts first.");
      return;
    }

    createMut.mutate();
  }

  function handleSaveImport() {
    setError(null);
    if (!name.trim()) {
      setError("Add a campaign name.");
      return;
    }
    if (!templateName.trim()) {
      setError("Choose an approved template (or enter the name manually).");
      return;
    }
    if (importRecipients.length === 0) {
      setError("Upload a CSV with at least one valid phone number.");
      return;
    }
    if (saveMode === "schedule" && !scheduledLocal) {
      setError("Pick a schedule time.");
      return;
    }
    importMut.mutate();
  }

  const wizardStep: CampaignWizardStep = (() => {
    const audienceReady =
      mode === "audience"
        ? (preview?.sendableCount ?? preview?.count ?? 0) > 0
        : importRecipients.length > 0;
    if (!name.trim() || !audienceReady) return "audience";
    if (!templateName.trim()) return "template";
    return "send";
  })();

  const submitChecklist: CampaignSubmitChecklistItem[] = [
    {
      id: "name",
      label: "Campaign name",
      done: !!name.trim(),
      hint: "Give this broadcast a clear internal name",
    },
    mode === "audience"
      ? {
          id: "audience",
          label: "Audience matched",
          done: (preview?.sendableCount ?? preview?.count ?? 0) > 0,
          hint: "Set filters, then Preview — or Save will count matches automatically",
        }
      : {
          id: "import",
          label: "CSV imported",
          done: importRecipients.length > 0,
          hint: "Upload phone numbers (phone, name columns)",
        },
    {
      id: "template",
      label: "Approved WhatsApp template",
      done: !!templateName.trim(),
      hint: "Enter exact name from Meta or pick from synced list",
    },
    ...(templateVarCount > 0
      ? [
          {
            id: "template-vars",
            label: `All ${templateVarCount} template variable${templateVarCount > 1 ? "s" : ""} filled`,
            done: templateParamsReady(templateVarCount, templateParams),
            hint: "Each {{1}}, {{2}}, … placeholder needs a value",
          } satisfies CampaignSubmitChecklistItem,
        ]
      : []),
    {
      id: "when",
      label: saveMode === "schedule" ? "Scheduled time (IST)" : "Save as draft",
      done: saveMode === "draft" || !!scheduledLocal,
      hint: saveMode === "schedule" ? "Pick when to send" : undefined,
    },
  ];

  const canAttemptSaveAudience =
    canManage &&
    name.trim() &&
    templateName.trim() &&
    templateParamsReady(templateVarCount, templateParams) &&
    (saveMode === "draft" || !!scheduledLocal) &&
    !createMut.isPending &&
    !previewMut.isPending;
  const canAttemptSaveImport =
    canManage &&
    name.trim() &&
    templateName.trim() &&
    templateParamsReady(templateVarCount, templateParams) &&
    importRecipients.length > 0 &&
    (saveMode === "draft" || !!scheduledLocal) &&
    !importMut.isPending;

  const savePending = createMut.isPending || importMut.isPending || previewMut.isPending;

  const scheduledCount = (campaigns ?? []).filter((c) => c.status === "SCHEDULED").length;

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero campaigns-page-hero mb-6 rounded-3xl border border-accent/15 bg-gradient-to-br from-bento-mint/80 via-card to-viz-violet/10 p-6 md:p-8 elev-1">
        <PageHeader
          className="mb-0"
          title="Campaigns"
          description="Broadcast approved WhatsApp templates, track delivery and replies, and close the loop from Inbox."
        />
      </div>

      {campaignsPlanOk === false && <CampaignsPlanGate className="mb-6" />}

      {campaignsPlanOk === true && (
        <CampaignsHubStats
          campaigns={campaigns}
          replyMetrics={replyMetrics}
          isLoading={isLoading}
        />
      )}

      {canManage && campaignsPlanOk === false && (
        <div className="mb-6 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          You have view-only access. Ask an admin or manager to create and send campaigns.
        </div>
      )}

      {canManage && campaignsPlanOk === true && (
        <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <strong className="font-semibold">Meta policy:</strong> Business-initiated outbound
          messages must use a <strong>pre-approved WhatsApp template</strong> from WhatsApp
          Manager. Contacts who reply <strong>STOP</strong> or opt out in Growvisi are automatically
          skipped from future broadcasts.
        </div>
      )}

      {canManage && campaignsPlanOk === true && (
        <div id="new-campaign" className="mb-6 overflow-hidden rounded-3xl border border-accent/20 bg-card elev-1">
          <div className="border-b border-border/70 bg-gradient-to-r from-bento-mint/50 via-card to-viz-violet/10 px-5 py-6 md:px-8">
            <h3 className="font-sans text-xl font-bold tracking-tight text-foreground">
              New campaign
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Broadcast an approved WhatsApp template to a CRM segment or imported list. Human replies
              stay in Inbox — Growvisi never auto-replies.
            </p>
            <CampaignWizardSteps current={wizardStep} className="mt-6" />
          </div>

          <div className="space-y-6 p-5 md:p-8">
            <CampaignModeToggle
              mode={mode}
              onModeChange={(next) => {
                setMode(next);
                setError(null);
              }}
            />

            <Field label="Campaign name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Diwali offer — qualified leads"
                className="h-11 rounded-xl text-sm"
              />
            </Field>

            <div className="grid gap-6 lg:grid-cols-2">
              {mode === "audience" ? (
                <CampaignWizardSection
                  title="Audience filters"
                  description="Narrow pipeline contacts by stage, tags, or lead score. Opt-outs are skipped automatically."
                >
                  <div className="space-y-4">
                    <Field label="Stages">
                      <div className="flex flex-wrap gap-1.5">
                        {LEAD_STAGES.map((s) => (
                          <FilterChip
                            key={s}
                            active={stages.includes(s)}
                            onClick={() => toggleStage(s)}
                          >
                            {STAGE_LABELS[s]}
                          </FilterChip>
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
                                "rounded-full px-2.5 py-1 text-xs font-semibold transition",
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
                        className="h-11 w-36 rounded-xl text-sm"
                      />
                    </Field>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => previewMut.mutate()}
                        disabled={previewMut.isPending}
                        className="h-10 rounded-xl"
                      >
                        {previewMut.isPending ? (
                          <GrowvisiSpinner size="sm" />
                        ) : (
                          <Users className="h-4 w-4" />
                        )}
                        Preview audience
                      </Button>
                      {preview && (
                        <p className="text-sm font-semibold text-foreground">
                          {preview.sendableCount ?? preview.count} will receive
                          {(preview.optOutCount ?? 0) > 0 && (
                            <span className="font-medium text-warning">
                              {" "}
                              · {preview.optOutCount} opted out
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {preview && preview.sample.length > 0 && (
                      <div className="rounded-xl border border-border/80 bg-background/80 p-3">
                        <p className="text-xs font-semibold text-foreground">
                          Sample contacts ({preview.count} total)
                        </p>
                        <ul className="mt-2 space-y-1">
                          {preview.sample.map((s) => (
                            <li
                              key={s.id}
                              className="flex justify-between text-xs text-muted-foreground"
                            >
                              <span>{s.displayName || s.phone}</span>
                              <span>{STAGE_LABELS[s.stage as LeadStage] ?? s.stage}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CampaignWizardSection>
              ) : (
                <CampaignWizardSection
                  title="Import contacts"
                  description="Upload a CSV with phone numbers. Header row supported (phone, name)."
                >
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
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent/25 bg-gradient-to-b from-bento-mint/20 to-background px-4 py-10 text-center transition hover:border-accent/50"
                    onClick={() => fileRef.current?.click()}
                    onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                    role="button"
                    tabIndex={0}
                  >
                    <Upload className="mb-3 h-9 w-9 text-accent" />
                    <p className="text-sm font-semibold text-foreground">
                      Drop or click to upload CSV
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Columns: phone, name (optional)
                    </p>
                    {importFileName && (
                      <p className="mt-3 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                        {importFileName}
                      </p>
                    )}
                  </div>
                  {importRecipients.length > 0 && (
                    <div className="mt-4 rounded-xl border border-border/80 bg-background/80 p-3">
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
                </CampaignWizardSection>
              )}

              <div className="space-y-6">
                <CampaignWizardSection
                  title="Template & message"
                  description="Meta requires an approved template for business-initiated WhatsApp messages."
                >
                  <div className="space-y-4">
                    {activeAccounts.length > 0 && (
                      <Field label="Send from">
                        <select
                          value={whatsappAccountId}
                          onChange={(e) => setWhatsappAccountId(e.target.value)}
                          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                          disabled={!canManage}
                        >
                          <option value="">
                            {activeAccounts.length === 1
                              ? activeAccounts[0].displayPhoneNumber
                              : "Default number (oldest active)"}
                          </option>
                          {activeAccounts.length > 1 &&
                            activeAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.displayPhoneNumber}
                              </option>
                            ))}
                        </select>
                      </Field>
                    )}
                    <WhatsappTemplatePicker
                      templateName={templateName}
                      languageCode={languageCode}
                      templateParams={templateParams}
                      onTemplateNameChange={setTemplateName}
                      onLanguageCodeChange={setLanguageCode}
                      onVariableCountChange={setTemplateVarCount}
                      disabled={!canManage}
                    />
                    {templateVarCount > 0 && (
                      <TemplateParamFields
                        count={templateVarCount}
                        values={templateParams}
                        onChange={setTemplateParams}
                        disabled={!canManage}
                      />
                    )}
                    <Field label="Fallback message body (optional)">
                      <textarea
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        placeholder="Used as template body param when no explicit variables are set."
                        className="min-h-[80px] w-full rounded-xl border border-border px-3 py-2.5 text-sm"
                      />
                    </Field>
                  </div>
                </CampaignWizardSection>

                <CampaignWizardSection
                  title="When to send"
                  description="Save as draft to review later, or schedule for a specific IST time."
                >
                  <CampaignSchedulePicker
                    mode={saveMode}
                    onModeChange={setSaveMode}
                    scheduledLocal={scheduledLocal}
                    onScheduledLocalChange={setScheduledLocal}
                    disabled={!canManage}
                  />
                </CampaignWizardSection>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="grid gap-5 border-t border-border/70 pt-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <CampaignSubmitChecklist items={submitChecklist} />
              <div className="flex flex-col gap-2 sm:flex-row lg:min-w-[220px] lg:flex-col">
                {mode === "audience" ? (
                  <Button
                    size="lg"
                    className="h-12 w-full rounded-xl text-base font-semibold"
                    onClick={() => void handleSaveAudience()}
                    disabled={!canAttemptSaveAudience}
                  >
                    {savePending ? <GrowvisiSpinner size="sm" /> : null}
                    {saveMode === "schedule" ? "Schedule campaign" : "Save campaign"}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="h-12 w-full rounded-xl text-base font-semibold"
                    onClick={handleSaveImport}
                    disabled={!canAttemptSaveImport}
                  >
                    {savePending ? <GrowvisiSpinner size="sm" /> : null}
                    {saveMode === "schedule" ? "Schedule import" : "Import & save"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <CampaignsListSection
        campaigns={campaigns ?? []}
        listFilter={listFilter}
        onListFilterChange={setListFilter}
        scheduledCount={scheduledCount}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onSelectCampaign={setDetailId}
      />

      <Dialog open={!!detailId} onOpenChange={(next) => !next && setDetailId(null)}>
        <DialogContent side="right" showClose={false} className="max-w-lg gap-0 p-0 sm:max-w-[560px]">
          <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-accent via-success to-success px-5 py-5 text-white">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-6 right-12 h-20 w-20 rounded-full bg-white/5" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                  Campaign detail
                </p>
                <DialogTitle className="mt-1 text-xl font-bold text-white">
                  {detail?.name ?? "Loading…"}
                </DialogTitle>
                {detail?.templateName && (
                  <p className="mt-1 truncate text-sm text-white/80">{detail.templateName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailId(null)}
                className="rounded-lg bg-white/15 p-2 text-white hover:bg-white/25"
                aria-label="Close campaign detail"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        CAMPAIGN_STATUS_BADGE[detail.status],
                      )}
                    >
                      {CAMPAIGN_STATUS_LABELS[detail.status]}
                    </span>
                    {detail.scheduledAt && detail.status === "SCHEDULED" && (
                      <span
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                          STATUS_TONE.info,
                        )}
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                        Sends {formatDateTimeIst(detail.scheduledAt)}
                      </span>
                    )}
                  </div>

                  {detail.status === "RUNNING" && progress && (
                    <div className="mb-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
                      <div className="mb-2 flex items-center justify-between text-xs font-medium text-warning">
                        <span>Sending in progress…</span>
                        <span>
                          {progress.attempted}/{progress.totalRecipients} ({progress.progressPct}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-warning/15">
                        <div
                          className="h-full rounded-full bg-accent transition-all"
                          style={{ width: `${progress.progressPct}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-warning">
                        Delivered or read: {progress.deliveredOrRead} · Failed: {progress.failed}
                      </p>
                    </div>
                  )}

                  {detail.totalRecipients > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Delivery funnel
                      </p>
                      <CampaignDeliveryFunnel
                        stats={
                          detail.deliveryStats
                            ? {
                                total: detail.totalRecipients,
                                ...detail.deliveryStats,
                                replied:
                                  detail.deliveryStats.replied ?? detail.replyCount ?? 0,
                              }
                            : buildCampaignDeliveryStats({
                                totalRecipients: detail.totalRecipients,
                                sentCount: detail.sentCount,
                                deliveredCount: detail.deliveredCount,
                                failedCount: detail.failedCount,
                                readCount: detail.readCount,
                                replyCount: detail.replyCount,
                                skippedCount: 0,
                              })
                        }
                      />
                    </div>
                  )}

                  <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Stat label="Recipients" value={String(detail.totalRecipients)} />
                    <Stat label="Delivered" value={String(detail.deliveredCount)} />
                    <Stat
                      label="Replies"
                      value={String(detail.replyCount ?? detail.deliveryStats?.replied ?? 0)}
                      highlight={(detail.replyCount ?? 0) > 0}
                    />
                    <Stat label="Sent" value={String(detail.sentCount)} />
                    <Stat label="Read" value={String(detail.readCount ?? detail.deliveryStats?.read ?? 0)} />
                    <Stat label="Failed" value={String(detail.failedCount)} />
                    {(detail.deliveryStats?.skipped ?? 0) > 0 && (
                      <Stat
                        label="Skipped"
                        value={String(detail.deliveryStats?.skipped ?? 0)}
                      />
                    )}
                  </div>

                  {(detail.whatsappAccountId || detail.createdAt) && (
                    <p className="mb-4 text-xs text-muted-foreground">
                      {detail.whatsappAccountId && (
                        <>
                          Send from:{" "}
                          <strong className="text-foreground">
                            {activeAccounts.find((a) => a.id === detail.whatsappAccountId)
                              ?.displayPhoneNumber ?? "Selected number"}
                          </strong>
                        </>
                      )}
                      {detail.whatsappAccountId && detail.createdAt && (
                        <span className="mx-2 text-border">·</span>
                      )}
                      {detail.createdAt && <>Created {formatDate(detail.createdAt)}</>}
                    </p>
                  )}

                  {detail.templateName && (
                    <div className="mb-4 rounded-xl border border-border/80 bg-background p-3">
                      <p className="text-xs text-muted-foreground">
                        Template: <strong className="text-foreground">{detail.templateName}</strong>
                        {detail.audienceFilter?.languageCode
                          ? ` · ${detail.audienceFilter.languageCode}`
                          : ""}
                      </p>
                      {detail.messageBody && (
                        <TemplatePreviewBubble
                          className="mt-3 border-none bg-transparent p-0"
                          body={detail.messageBody}
                          params={detail.audienceFilter?.templateParams ?? []}
                        />
                      )}
                    </div>
                  )}

                  {(detail.status === "DRAFT" || detail.status === "FAILED") && (
                    <div className="mb-5 rounded-xl border border-border/80 p-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        Schedule instead of sending now (IST)
                      </p>
                      <Input
                        type="datetime-local"
                        value={detailScheduleLocal}
                        onChange={(e) => setDetailScheduleLocal(e.target.value)}
                        className="mt-2 h-10 text-sm"
                        min={toDatetimeLocalValue(new Date(Date.now() + 6 * 60_000))}
                      />
                      {formatIstPreview(detailScheduleLocal) && (
                        <p className="mt-2 text-xs font-medium text-foreground">
                          Sends {formatIstPreview(detailScheduleLocal)} IST
                        </p>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full"
                        disabled={scheduleMut.isPending}
                        onClick={() => {
                          setError(null);
                          scheduleMut.mutate({
                            id: detail.id,
                            scheduledAt: localDatetimeToIso(detailScheduleLocal),
                          });
                        }}
                      >
                        {scheduleMut.isPending ? (
                          <GrowvisiSpinner size="sm" />
                        ) : (
                          <CalendarClock className="h-4 w-4" />
                        )}
                        Schedule send
                      </Button>
                    </div>
                  )}

                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Recipients
                      {detail.recipientsTruncated && (
                        <span className="ml-1 font-normal text-muted-foreground/80">
                          (showing first 500 of {detail.totalRecipients})
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {detail.totalRecipients > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={() => {
                            if (!token || !detail.id) return;
                            void apiDownload(
                              `/campaigns/${detail.id}/export`,
                              `growvisi-campaign-${detail.name.replace(/\s+/g, "-").slice(0, 24)}.csv`,
                              token,
                            );
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Export CSV
                        </Button>
                      )}
                      <div className="flex flex-wrap gap-1">
                      {(
                        [
                          ["all", "All"],
                          ["replied", "Replied"],
                          ["delivered", "Delivered"],
                          ["read", "Read"],
                          ["failed", "Failed"],
                          ["skipped", "Skipped"],
                          ["pending", "Pending"],
                        ] as const
                      ).map(([id, label]) => (
                        <FilterChip
                          key={id}
                          active={recipientFilter === id}
                          onClick={() => setRecipientFilter(id)}
                        >
                          {label}
                        </FilterChip>
                      ))}
                      </div>
                    </div>
                  </div>
                  <ul className="divide-y divide-border/60 rounded-xl border border-border/80">
                    {detail.recipients
                      .filter((r) => {
                        if (recipientFilter === "all") return true;
                        if (recipientFilter === "replied") return !!r.repliedAt;
                        if (recipientFilter === "skipped") return r.status === "SKIPPED";
                        return r.status === recipientFilter.toUpperCase();
                      })
                      .map((r) => (
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
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {r.repliedAt && (
                              <Link
                                href={
                                  r.conversationId
                                    ? `/dashboard/inbox?c=${r.conversationId}`
                                    : "/dashboard/inbox"
                                }
                                className="inline-flex items-center gap-1 rounded-full bg-viz-violet/15 px-2 py-0.5 text-[11px] font-semibold text-viz-violet hover:bg-viz-violet/20"
                              >
                                <MessageCircleReply className="h-3 w-3" />
                                Replied
                              </Link>
                            )}
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-semibold",
                                r.status === "SENT" ||
                                r.status === "DELIVERED" ||
                                r.status === "READ"
                                  ? "bg-bento-mint text-accent"
                                  : r.status === "FAILED"
                                    ? "bg-destructive/10 text-destructive"
                                    : r.status === "SKIPPED"
                                      ? "bg-muted text-foreground"
                                      : "bg-muted text-muted-foreground",
                              )}
                            >
                              {r.status}
                            </span>
                          </div>
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
              <div className="flex flex-col gap-2 border-t border-border p-4">
                {error && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                {(detail.status === "COMPLETED" || detail.status === "FAILED") &&
                  detail.failedCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={retryMut.isPending}
                      onClick={() => {
                        setError(null);
                        retryMut.mutate(detail.id);
                      }}
                    >
                      {retryMut.isPending ? (
                        <GrowvisiSpinner size="sm" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Retry failed ({detail.failedCount})
                    </Button>
                  )}
                {detail.status === "SCHEDULED" && (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setError(null);
                        sendMut.mutate(detail.id);
                      }}
                      disabled={sendMut.isPending}
                    >
                      {sendMut.isPending ? (
                        <GrowvisiSpinner size="sm" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => cancelScheduleMut.mutate(detail.id)}
                      disabled={cancelScheduleMut.isPending}
                    >
                      Cancel schedule
                    </Button>
                  </div>
                )}
                {(detail.status === "DRAFT" || detail.status === "FAILED") && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setError(null);
                      sendMut.mutate(detail.id);
                    }}
                    disabled={sendMut.isPending}
                  >
                    {sendMut.isPending ? (
                      <GrowvisiSpinner size="sm" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send campaign now
                  </Button>
                )}
                {detail.status !== "RUNNING" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setConfirmDeleteId(detail.id)}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete campaign
                  </Button>
                )}
              </div>
            )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        title="Delete this campaign?"
        description="This cannot be undone. Recipients and send history for this campaign will be removed."
        confirmLabel="Delete campaign"
        isLoading={deleteMut.isPending}
        onConfirm={() => {
          if (confirmDeleteId) deleteMut.mutate(confirmDeleteId);
        }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        highlight
          ? "border-viz-violet/30 bg-gradient-to-br from-viz-violet/10 to-background"
          : "border-border/80 bg-background",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums", highlight && "text-viz-violet")}>
        {value}
      </p>
    </div>
  );
}
