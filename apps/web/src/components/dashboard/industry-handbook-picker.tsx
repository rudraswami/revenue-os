"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CUSTOM_INDUSTRY_ID,
  getDefaultCustomComposePersona,
  type IntelligenceWorkspaceSettings,
  type IntelligenceWorkspaceSettingsPatch,
} from "@growvisi/shared";
import { apiFetch } from "@/lib/api-client";
import { SelectableTile } from "@/components/ui/selectable-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useMutationPendingId } from "@/hooks/use-mutation-pending-id";

type CustomDraft = {
  customIndustryLabel: string;
  identity: string;
  guardrailsText: string;
};

function guardrailsToText(guardrails?: string[]): string {
  return (guardrails ?? []).join("\n");
}

function textToGuardrails(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildCustomDraft(
  settings: IntelligenceWorkspaceSettings | undefined,
  businessName: string,
): CustomDraft {
  const override = settings?.businessProfile?.composePersona;
  const label = settings?.customIndustryLabel ?? "";
  const defaults = getDefaultCustomComposePersona(businessName, label);

  return {
    customIndustryLabel: label,
    identity: override?.identity?.trim() || defaults.identity,
    guardrailsText: guardrailsToText(
      override?.guardrails?.length ? override.guardrails : defaults.guardrails,
    ),
  };
}

function activeIndustryLabel(
  handbooks: Array<{ id: string; label: string }>,
  settings: IntelligenceWorkspaceSettings | undefined,
): string {
  if (settings?.industryId === CUSTOM_INDUSTRY_ID) {
    const custom = settings.customIndustryLabel?.trim();
    return custom || "Other business";
  }
  const match = handbooks.find((h) => h.id === settings?.industryId);
  return match?.label ?? settings?.industryId ?? "";
}

export function IndustryHandbookPicker({
  canManage,
  currentIndustryId,
  settings,
  businessName = "your business",
  token,
  showHeading = true,
}: {
  canManage: boolean;
  currentIndustryId?: string;
  settings?: IntelligenceWorkspaceSettings;
  businessName?: string;
  token: string | null;
  showHeading?: boolean;
}) {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const isCustomActive = currentIndustryId === CUSTOM_INDUSTRY_ID;
  const [customDraftOpen, setCustomDraftOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState<CustomDraft | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);

  const showCustomPanel = customDraftOpen || isCustomActive;

  const { data: handbooks } = useQuery({
    queryKey: ["industry-handbooks"],
    queryFn: () =>
      apiFetch<Array<{ id: string; label: string; description: string }>>(
        "/organizations/industry-handbooks",
        { token: token ?? undefined },
      ),
    enabled: !!token,
  });

  const applyMutation = useMutation({
    mutationFn: (industryId: string) =>
      apiFetch<{ message: string; intelligence: IntelligenceWorkspaceSettings }>(
        "/organizations/apply-industry-handbook",
        {
          method: "POST",
          token: token ?? undefined,
          body: JSON.stringify({ industryId, seedKnowledge: true }),
        },
      ),
    onSuccess: (res) => {
      queryClient.setQueryData(["intelligence-settings"], res.intelligence);
      void queryClient.invalidateQueries({ queryKey: ["knowledge-health"] });
      void queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      success(res.message);
    },
    onError: () => toastError("Could not apply industry template."),
  });

  const saveCustomMutation = useMutation({
    mutationFn: (patch: IntelligenceWorkspaceSettingsPatch) =>
      apiFetch<IntelligenceWorkspaceSettings>("/organizations/intelligence-settings", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(patch),
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(["intelligence-settings"], res);
      setCustomDraftOpen(false);
      setLabelError(null);
      success("Custom business persona saved.");
    },
    onError: () => toastError("Could not save your business setup."),
  });

  const openCustomSetup = useCallback(() => {
    setCustomDraft(buildCustomDraft(settings, businessName));
    setCustomDraftOpen(true);
    setLabelError(null);
  }, [settings, businessName]);

  useEffect(() => {
    if (!showCustomPanel || !settings) return;
    setCustomDraft(buildCustomDraft(settings, businessName));
    // Reload when saved settings change — not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- industryId + label are reset signals
  }, [settings?.industryId, settings?.customIndustryLabel, businessName, showCustomPanel]);

  const pendingId = useMutationPendingId(applyMutation);
  const otherSelected = isCustomActive || customDraftOpen;
  const activeId = pendingId ?? (otherSelected ? CUSTOM_INDUSTRY_ID : currentIndustryId);

  const handleTileClick = (industryId: string) => {
    if (!canManage) return;

    if (industryId === CUSTOM_INDUSTRY_ID) {
      openCustomSetup();
      return;
    }

    setCustomDraftOpen(false);
    setLabelError(null);
    applyMutation.mutate(industryId);
  };

  const handleSaveCustom = () => {
    if (!customDraft || !canManage) return;

    const customIndustryLabel = customDraft.customIndustryLabel.trim();
    if (!customIndustryLabel) {
      setLabelError("Enter your business type so the AI knows your sector.");
      return;
    }

    const identity = customDraft.identity.trim();
    const guardrails = textToGuardrails(customDraft.guardrailsText);

    saveCustomMutation.mutate({
      industryId: CUSTOM_INDUSTRY_ID,
      customIndustryLabel,
      businessProfile: {
        composePersona: {
          identity: identity || getDefaultCustomComposePersona(businessName, customIndustryLabel).identity,
          guardrails:
            guardrails.length > 0
              ? guardrails
              : getDefaultCustomComposePersona(businessName, customIndustryLabel).guardrails,
        },
      },
    });
  };

  const handleCancelCustom = () => {
    setCustomDraftOpen(false);
    setLabelError(null);
    if (!isCustomActive) {
      setCustomDraft(null);
    }
  };

  if (!handbooks?.length) return null;

  const activeLabel = activeIndustryLabel(handbooks, settings);

  return (
    <div className="space-y-3">
      {showHeading ? (
        <p className="text-xs font-medium text-foreground">Industry template</p>
      ) : null}

      {currentIndustryId && !pendingId ? (
        <p className="text-xs text-muted-foreground">
          Active:{" "}
          <span className="font-medium text-foreground">{activeLabel}</span>
          {isCustomActive && settings?.customIndustryLabel?.trim() ? (
            <span className="text-muted-foreground"> (Other)</span>
          ) : null}
        </p>
      ) : pendingId && pendingId !== CUSTOM_INDUSTRY_ID ? (
        <p className="text-xs font-medium text-accent">Seeding starter docs…</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Tap a sector to apply a template. Choose Other to describe your business type first.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {handbooks.map((hb) => (
          <SelectableTile
            key={hb.id}
            title={hb.label}
            description={hb.description}
            selected={activeId === hb.id}
            pending={pendingId === hb.id}
            disabled={
              !canManage ||
              saveCustomMutation.isPending ||
              (applyMutation.isPending && pendingId !== hb.id)
            }
            onClick={() => handleTileClick(hb.id)}
          />
        ))}
      </div>

      {showCustomPanel && customDraft ? (
        <div className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
          <div>
            <p className="text-xs font-semibold text-foreground">Your business setup</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Tell us what you do — the AI uses this to tailor replies. Nothing is saved until you
              confirm below.
            </p>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">
              Your business type <span className="text-destructive">*</span>
            </span>
            <Input
              disabled={!canManage || saveCustomMutation.isPending}
              value={customDraft.customIndustryLabel}
              onChange={(e) => {
                setLabelError(null);
                setCustomDraft({ ...customDraft, customIndustryLabel: e.target.value });
              }}
              placeholder="e.g. E-commerce, Legal services, IT consultancy"
              aria-invalid={!!labelError}
            />
            {labelError ? (
              <p className="text-[11px] text-destructive">{labelError}</p>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                This is what the AI considers your industry — e.g. &quot;Dental clinic&quot; or
                &quot;Online coaching&quot;.
              </p>
            )}
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">Who is the AI?</span>
            <textarea
              disabled={!canManage || saveCustomMutation.isPending}
              value={customDraft.identity}
              onChange={(e) => setCustomDraft({ ...customDraft, identity: e.target.value })}
              rows={4}
              className="w-full resize-y rounded-xl border border-input bg-card px-3 py-2 text-sm leading-relaxed"
              placeholder="You are a helpful advisor at {businessName} who..."
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-foreground">Business rules</span>
            <textarea
              disabled={!canManage || saveCustomMutation.isPending}
              value={customDraft.guardrailsText}
              onChange={(e) => setCustomDraft({ ...customDraft, guardrailsText: e.target.value })}
              rows={4}
              className="w-full resize-y rounded-xl border border-input bg-card px-3 py-2 text-sm leading-relaxed"
              placeholder={"One rule per line\ne.g. Never invent prices not in our knowledge"}
            />
            <p className="text-[10px] text-muted-foreground">One rule per line.</p>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!canManage || saveCustomMutation.isPending}
              onClick={handleSaveCustom}
            >
              {saveCustomMutation.isPending ? "Saving…" : "Save business setup"}
            </Button>
            {!isCustomActive ? (
              <Button
                size="sm"
                variant="outline"
                disabled={saveCustomMutation.isPending}
                onClick={handleCancelCustom}
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
