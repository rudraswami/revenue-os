"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, Settings2 } from "lucide-react";
import type {
  AutomationPolicyPreset,
  BusinessEmployeeProfile,
  BusinessEmployeeProfilePatch,
  GrowvisiPlanId,
  IntelligenceWorkspaceSettings,
  IntelligenceWorkspaceSettingsPatch,
  ReplyAutonomyMode,
} from "@growvisi/shared";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { canManageCampaigns } from "@/lib/permissions";
import { useShellBilling } from "@/hooks/use-shell-cached-query";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { AUTONOMY_OPTIONS, PRESET_OPTIONS } from "@/lib/automation-scenarios";
import { AssistantTrustPanel } from "@/components/dashboard/automations/assistant-trust-panel";
import { AutonomyModeIcon } from "@/components/dashboard/automations/autonomy-mode-icons";
import { ConversationPreview } from "@/components/dashboard/automations/conversation-preview";
import { IndustryHandbookPicker } from "@/components/dashboard/industry-handbook-picker";
import { KnowledgeSettingsLink } from "@/components/settings/knowledge-settings-link";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const PLAN_RANK: Record<GrowvisiPlanId, number> = {
  trial: 0,
  starter: 1,
  growth: 2,
  pro: 3,
};

type ProfileDraft = {
  voice: NonNullable<BusinessEmployeeProfile["voice"]>;
  language: NonNullable<BusinessEmployeeProfile["language"]>;
  escalation: NonNullable<BusinessEmployeeProfile["escalation"]>;
  closeActions: NonNullable<BusinessEmployeeProfile["closeActions"]>;
  firstContactText: string;
  returningText: string;
};

function profileToDraft(profile: BusinessEmployeeProfile): ProfileDraft {
  return {
    voice: { ...profile.voice },
    language: { ...profile.language },
    escalation: { ...profile.escalation },
    closeActions: { ...profile.closeActions },
    firstContactText: profile.greetingVariants.firstContact.join("\n"),
    returningText: profile.greetingVariants.returning.join("\n"),
  };
}

function linesToGreetings(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function draftToPatch(draft: ProfileDraft): BusinessEmployeeProfilePatch {
  return {
    voice: draft.voice,
    language: draft.language,
    escalation: {
      contactName: draft.escalation.contactName,
      contactPhone: draft.escalation.contactPhone || undefined,
      slaMinutes: draft.escalation.slaMinutes,
    },
    closeActions: {
      paymentLink: draft.closeActions.paymentLink || undefined,
      bookingUrl: draft.closeActions.bookingUrl || undefined,
      callNumber: draft.closeActions.callNumber || undefined,
    },
    greetingVariants: {
      firstContact: linesToGreetings(draft.firstContactText),
      returning: linesToGreetings(draft.returningText),
    },
  };
}

function useDebouncedSave(
  save: (patch: IntelligenceWorkspaceSettingsPatch) => void,
  delayMs = 800,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (patch: IntelligenceWorkspaceSettingsPatch) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => save(patch), delayMs);
    },
    [save, delayMs],
  );
}

export function WhatsAppAssistantZone() {
  const token = useAuthStore((s) => s.accessToken);
  const organization = useAuthStore((s) => s.organization);
  const role = useAuthStore((s) => s.role);
  const canManage = canManageCampaigns(role);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [styleOpen, setStyleOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [editingGreeting, setEditingGreeting] = useState<"first" | "returning" | null>(null);
  const [optimisticMode, setOptimisticMode] = useState<ReplyAutonomyMode | null>(null);
  const [optimisticPreset, setOptimisticPreset] = useState<AutomationPolicyPreset | null>(null);
  const [savingMode, setSavingMode] = useState<ReplyAutonomyMode | null>(null);
  const [savingPreset, setSavingPreset] = useState<AutomationPolicyPreset | null>(null);

  const businessName = organization?.name?.trim() || "your business";

  const { data, isLoading } = useQuery({
    queryKey: ["intelligence-settings"],
    queryFn: () =>
      apiFetch<IntelligenceWorkspaceSettings>("/organizations/intelligence-settings", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const { data: billing } = useShellBilling<{ planId: GrowvisiPlanId }>();

  const { data: kbHealth } = useQuery({
    queryKey: ["knowledge-health"],
    queryFn: () =>
      apiFetch<{
        chunkCount: number;
        gapRiskScore: number;
        readyForResponsivePreset: boolean;
      }>("/knowledge/health", { token: token ?? undefined }),
    enabled: !!token,
  });

  useEffect(() => {
    if (data?.businessProfile) {
      setDraft(profileToDraft(data.businessProfile));
    }
  }, [data?.businessProfile]);

  const growthPlanOk = PLAN_RANK[billing?.planId ?? "trial"] >= PLAN_RANK.growth;
  const responsiveBlocked = kbHealth != null && !kbHealth.readyForResponsivePreset;

  const mutation = useMutation({
    mutationFn: (patch: IntelligenceWorkspaceSettingsPatch) =>
      apiFetch<IntelligenceWorkspaceSettings>("/organizations/intelligence-settings", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(patch),
      }),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["intelligence-settings"] });
      const previous = queryClient.getQueryData<IntelligenceWorkspaceSettings>([
        "intelligence-settings",
      ]);
      if (previous) {
        const { businessProfile: _bp, ...rest } = patch;
        queryClient.setQueryData<IntelligenceWorkspaceSettings>(["intelligence-settings"], {
          ...previous,
          ...rest,
        });
      }
      return { previous };
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["intelligence-settings"], next);
      if (next.businessProfile) {
        setDraft(profileToDraft(next.businessProfile));
      }
      setOptimisticMode(null);
      setOptimisticPreset(null);
      setSavingMode(null);
      setSavingPreset(null);
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["intelligence-settings"], context.previous);
      }
      setOptimisticMode(null);
      setOptimisticPreset(null);
      setSavingMode(null);
      setSavingPreset(null);
      toastError("Could not save assistant settings.");
    },
  });

  const profileMutation = useMutation({
    mutationFn: (patch: IntelligenceWorkspaceSettingsPatch) =>
      apiFetch<IntelligenceWorkspaceSettings>("/organizations/intelligence-settings", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(patch),
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(["intelligence-settings"], next);
      if (next.businessProfile) {
        setDraft(profileToDraft(next.businessProfile));
      }
      success("Saved.");
    },
    onError: () => toastError("Could not save."),
  });

  const debouncedProfileSave = useDebouncedSave((patch) => {
    if (canManage) profileMutation.mutate(patch);
  });

  const currentMode = optimisticMode ?? data?.replyAutonomy ?? "assist";
  const currentPreset = optimisticPreset ?? data?.automationPreset ?? "balanced";
  const isSyncing = savingMode !== null || savingPreset !== null;

  function selectMode(mode: ReplyAutonomyMode) {
    if (!canManage || mode === currentMode) return;
    if (mode === "auto_guarded" && !growthPlanOk) return;
    setOptimisticMode(mode);
    setSavingMode(mode);
    const patch: IntelligenceWorkspaceSettingsPatch = { replyAutonomy: mode };
    if (mode === "auto_guarded" && !data?.automationPreset) {
      patch.automationPreset = "balanced";
      setOptimisticPreset("balanced");
    }
    mutation.mutate(patch);
  }

  function selectPreset(preset: AutomationPolicyPreset) {
    if (!canManage || mutation.isPending || preset === currentPreset) return;
    if (preset === "responsive" && responsiveBlocked) return;
    setOptimisticPreset(preset);
    setSavingPreset(preset);
    mutation.mutate({ automationPreset: preset });
  }

  function updateDraft<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      debouncedProfileSave({ businessProfile: draftToPatch(next) });
      return next;
    });
  }

  const greetingPreview =
    draft?.firstContactText.split("\n").find((l) => l.trim()) ??
    `Hi! Thanks for messaging ${businessName}.`;
  const thanksPreview =
    data?.businessProfile?.courtesyTemplates?.thanks?.[0] ??
    "You're welcome! Let us know if you need anything else.";

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="assistant-zone-heading" className="space-y-6">
      <div>
        <h2 id="assistant-zone-heading" className="text-lg font-bold tracking-tight text-foreground">
          Your WhatsApp assistant
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How Growvisi helps when customers message you on WhatsApp.
        </p>
      </div>

      <AssistantTrustPanel />

      <KnowledgeSettingsLink variant="banner" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        {/* Decisions */}
        <div className="space-y-5">
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">
              How much should Growvisi do on WhatsApp?
            </p>
            <div className="space-y-2">
              {AUTONOMY_OPTIONS.map((opt) => {
                const active = currentMode === opt.mode;
                const isSaving = savingMode === opt.mode;
                const needsGrowth = opt.mode === "auto_guarded" && !growthPlanOk;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    disabled={!canManage || needsGrowth}
                    onClick={() => selectMode(opt.mode)}
                    aria-pressed={active}
                    aria-busy={isSaving}
                    className={cn(
                      "group relative flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow] duration-150",
                      active
                        ? "border-accent/50 bg-bento-mint/40 shadow-sm ring-1 ring-accent/15"
                        : "border-border/70 bg-card hover:border-accent/25 hover:bg-bento-mint/15",
                      !canManage && "cursor-not-allowed opacity-70",
                    )}
                  >
                    <AutonomyModeIcon mode={opt.mode} active={active} />
                    <div className="min-w-0 flex-1 pr-8">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{opt.title}</p>
                        {opt.recommended && !active ? (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                            Recommended
                          </span>
                        ) : null}
                        {needsGrowth && active ? (
                          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
                            Growth plan
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {opt.subtitle}
                      </p>
                      {needsGrowth && active ? (
                        <Link
                          href="/dashboard/pricing"
                          className="mt-1.5 inline-block text-xs font-semibold text-accent hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Upgrade to Growth (₹2,999/mo) →
                        </Link>
                      ) : null}
                    </div>
                    {isSaving ? (
                      <Loader2
                        className="absolute right-4 top-4 h-4 w-4 animate-spin text-accent"
                        aria-hidden
                      />
                    ) : active ? (
                      <Check className="absolute right-4 top-4 h-4 w-4 text-accent" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {currentMode === "auto_guarded" ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-foreground">
                How far should auto-reply go?
              </p>
              <SegmentedControl
                size="md"
                aria-label="Auto-reply preset"
                value={currentPreset}
                onChange={(preset) => selectPreset(preset as AutomationPolicyPreset)}
                options={PRESET_OPTIONS.map((p) => ({
                  value: p.preset,
                  label: p.title,
                }))}
                className="w-full"
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {PRESET_OPTIONS.find((p) => p.preset === currentPreset)?.hint}
              </p>
              {responsiveBlocked ? (
                <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-foreground">Business Knowledge</span>
                    <span className="text-muted-foreground">{kbHealth?.chunkCount ?? 0} docs</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${Math.min(100, (kbHealth?.chunkCount ?? 0) * 20)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Add pricing &amp; FAQs in <KnowledgeSettingsLink /> to unlock broader auto-send.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Preview */}
        <ConversationPreview
          mode={currentMode}
          preset={currentPreset}
          businessName={businessName}
          greetingSample={greetingPreview}
          thanksSample={thanksPreview}
          syncing={isSyncing}
        />
      </div>

      {/* Communication style — collapsed */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-muted/20"
          onClick={() => setStyleOpen((v) => !v)}
          aria-expanded={styleOpen}
        >
          <div>
            <p className="text-sm font-semibold text-foreground">How should Growvisi sound?</p>
            <p className="text-xs text-muted-foreground">Tone, language &amp; greeting messages</p>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", styleOpen && "rotate-180")}
          />
        </button>

        {styleOpen && draft ? (
          <div className="space-y-5 border-t border-border/60 px-5 pb-5 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-foreground">Tone</span>
                <Select
                  disabled={!canManage || profileMutation.isPending}
                  value={draft.voice.register}
                  onChange={(e) =>
                    updateDraft("voice", {
                      ...draft.voice,
                      register: e.target.value as ProfileDraft["voice"]["register"],
                    })
                  }
                >
                  <option value="casual">Casual</option>
                  <option value="professional">Professional</option>
                </Select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-foreground">Default language</span>
                <Select
                  disabled={!canManage || profileMutation.isPending}
                  value={draft.language.default}
                  onChange={(e) =>
                    updateDraft("language", {
                      ...draft.language,
                      default: e.target.value as ProfileDraft["language"]["default"],
                    })
                  }
                >
                  <option value="hinglish">Hinglish</option>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </Select>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-foreground">Mirror customer&apos;s language</p>
                <p className="text-[11px] text-muted-foreground">Reply in Hindi or Hinglish when they write that way</p>
              </div>
              <Switch
                checked={draft.language.mirrorCustomer}
                disabled={!canManage || profileMutation.isPending}
                onCheckedChange={(mirrorCustomer) =>
                  updateDraft("language", { ...draft.language, mirrorCustomer })
                }
                aria-label="Mirror customer language"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-foreground">Greeting messages</p>
              <p className="mb-3 text-[11px] text-muted-foreground">
                Used for hi/thanks and simple replies. Click a bubble to edit. One greeting per line.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <GreetingBubble
                  label="First message from a new customer"
                  text={draft.firstContactText.split("\n")[0] ?? ""}
                  editing={editingGreeting === "first"}
                  disabled={!canManage || profileMutation.isPending}
                  onEdit={() => setEditingGreeting("first")}
                  onBlur={() => setEditingGreeting(null)}
                  onChange={(line) => {
                    const rest = draft.firstContactText.split("\n").slice(1);
                    updateDraft("firstContactText", [line, ...rest].join("\n"));
                  }}
                />
                <GreetingBubble
                  label="When they message again"
                  text={draft.returningText.split("\n")[0] ?? ""}
                  editing={editingGreeting === "returning"}
                  disabled={!canManage || profileMutation.isPending}
                  onEdit={() => setEditingGreeting("returning")}
                  onBlur={() => setEditingGreeting(null)}
                  onChange={(line) => {
                    const rest = draft.returningText.split("\n").slice(1);
                    updateDraft("returningText", [line, ...rest].join("\n"));
                  }}
                />
              </div>
            </div>

            {profileMutation.isPending ? (
              <p className="text-[11px] text-muted-foreground">Saving…</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Advanced */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-muted/20"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
        >
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">Advanced</p>
              <p className="text-xs text-muted-foreground">Industry templates, escalation &amp; close actions</p>
            </div>
          </div>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-muted-foreground transition", advancedOpen && "rotate-180")}
          />
        </button>

        {advancedOpen && draft ? (
          <div className="space-y-5 border-t border-border/60 px-5 pb-5 pt-4">
            <IndustryHandbookPicker
              canManage={canManage}
              currentIndustryId={data?.industryId}
              token={token}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-foreground">Escalation contact</span>
                <Input
                  disabled={!canManage || profileMutation.isPending}
                  value={draft.escalation.contactName}
                  onChange={(e) =>
                    updateDraft("escalation", { ...draft.escalation, contactName: e.target.value })
                  }
                  placeholder="e.g. Priya from sales"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-foreground">Contact phone</span>
                <Input
                  disabled={!canManage || profileMutation.isPending}
                  value={draft.escalation.contactPhone ?? ""}
                  onChange={(e) =>
                    updateDraft("escalation", { ...draft.escalation, contactPhone: e.target.value })
                  }
                  placeholder="+91 98765 43210"
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-foreground">Close actions</p>
              <p className="mb-3 text-[11px] text-muted-foreground">
                Links Growvisi can include when a customer is ready to pay, book, or call.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[11px] text-muted-foreground">Payment link</span>
                  <Input
                    disabled={!canManage || profileMutation.isPending}
                    value={draft.closeActions.paymentLink ?? ""}
                    onChange={(e) =>
                      updateDraft("closeActions", {
                        ...draft.closeActions,
                        paymentLink: e.target.value,
                      })
                    }
                    placeholder="https://razorpay.me/..."
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] text-muted-foreground">Booking URL</span>
                  <Input
                    disabled={!canManage || profileMutation.isPending}
                    value={draft.closeActions.bookingUrl ?? ""}
                    onChange={(e) =>
                      updateDraft("closeActions", {
                        ...draft.closeActions,
                        bookingUrl: e.target.value,
                      })
                    }
                    placeholder="https://calendly.com/..."
                  />
                </label>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {!canManage ? (
        <p className="text-xs text-muted-foreground">
          View-only access. Ask an admin or manager to change assistant settings.
        </p>
      ) : null}
    </section>
  );
}

function GreetingBubble({
  label,
  text,
  editing,
  disabled,
  onEdit,
  onBlur,
  onChange,
}: {
  label: string;
  text: string;
  editing: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onBlur: () => void;
  onChange: (value: string) => void;
}) {
  if (editing) {
    return (
      <label className="block space-y-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <textarea
          autoFocus
          disabled={disabled}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          rows={3}
          className="w-full rounded-xl border border-accent/40 bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </label>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onEdit}
      className="rounded-xl border border-border/60 bg-[#ece5dd]/30 p-3 text-left transition hover:border-accent/30 hover:bg-bento-mint/20 disabled:opacity-60"
    >
      <p className="mb-2 text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="rounded-2xl rounded-tl-sm bg-card px-3 py-2 text-sm leading-relaxed text-foreground shadow-sm">
        {text || "Tap to add a greeting…"}
      </div>
    </button>
  );
}
