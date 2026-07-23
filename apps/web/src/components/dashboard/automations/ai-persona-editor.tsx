"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CUSTOM_INDUSTRY_ID,
  type IntelligenceWorkspaceSettings,
  type IntelligenceWorkspaceSettingsPatch,
} from "@growvisi/shared";
import { apiFetch } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

function guardrailsToText(guardrails?: string[]): string {
  return (guardrails ?? []).join("\n");
}

function textToGuardrails(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

type PersonaDraft = {
  customIndustryLabel: string;
  identity: string;
  guardrailsText: string;
};

function settingsToDraft(
  settings: IntelligenceWorkspaceSettings | undefined,
  businessName: string,
): PersonaDraft {
  const override = settings?.businessProfile?.composePersona;
  return {
    customIndustryLabel: settings?.customIndustryLabel ?? "",
    identity:
      override?.identity ??
      `You are a knowledgeable team member at ${businessName} who helps customers on WhatsApp.`,
    guardrailsText: guardrailsToText(override?.guardrails),
  };
}

function draftToPatch(draft: PersonaDraft): IntelligenceWorkspaceSettingsPatch {
  const identity = draft.identity.trim();
  const guardrails = textToGuardrails(draft.guardrailsText);
  const customIndustryLabel = draft.customIndustryLabel.trim();

  const patch: IntelligenceWorkspaceSettingsPatch = {};

  if (customIndustryLabel) {
    patch.customIndustryLabel = customIndustryLabel;
  }

  if (identity || guardrails.length > 0) {
    patch.businessProfile = {
      composePersona: {
        ...(identity ? { identity } : {}),
        ...(guardrails.length > 0 ? { guardrails } : {}),
      },
    };
  } else {
    patch.businessProfile = { composePersona: null };
  }

  return patch;
}

function useDebouncedPersonaSave(
  save: (patch: IntelligenceWorkspaceSettingsPatch) => void,
  delayMs = 900,
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

export function AiPersonaEditor({
  canManage,
  token,
  settings,
  businessName,
}: {
  canManage: boolean;
  token: string | null;
  settings?: IntelligenceWorkspaceSettings;
  businessName: string;
}) {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [draft, setDraft] = useState<PersonaDraft | null>(null);
  const isCustom = settings?.industryId === CUSTOM_INDUSTRY_ID;

  const saveMutation = useMutation({
    mutationFn: (patch: IntelligenceWorkspaceSettingsPatch) =>
      apiFetch<IntelligenceWorkspaceSettings>("/organizations/intelligence-settings", {
        method: "PATCH",
        token: token ?? undefined,
        body: JSON.stringify(patch),
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(["intelligence-settings"], res);
      success("AI persona saved.");
    },
    onError: () => toastError("Could not save AI persona."),
  });

  const debouncedSave = useDebouncedPersonaSave((patch) => {
    if (!canManage) return;
    saveMutation.mutate(patch);
  });

  useEffect(() => {
    if (!settings) return;
    setDraft(settingsToDraft(settings, businessName));
    // Reload when industry template changes — not on every autosave echo.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- industryId is the reset signal
  }, [settings?.industryId, businessName]);

  if (!draft) return null;

  const updateDraft = (partial: Partial<PersonaDraft>) => {
    const next = { ...draft, ...partial };
    setDraft(next);
    debouncedSave(draftToPatch(next));
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
      <div>
        <p className="text-xs font-semibold text-foreground">AI persona</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {isCustom
            ? "Describe how your AI should represent your business on WhatsApp."
            : "Optional — override the industry template persona for your business."}
        </p>
      </div>

      {isCustom ? (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-foreground">Your business type</span>
          <Input
            disabled={!canManage || saveMutation.isPending}
            value={draft.customIndustryLabel}
            onChange={(e) => updateDraft({ customIndustryLabel: e.target.value })}
            placeholder="e.g. E-commerce, Legal services, IT consultancy"
          />
        </label>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-foreground">Who is the AI?</span>
        <textarea
          disabled={!canManage || saveMutation.isPending}
          value={draft.identity}
          onChange={(e) => updateDraft({ identity: e.target.value })}
          rows={4}
          className="w-full resize-y rounded-xl border border-input bg-card px-3 py-2 text-sm leading-relaxed"
          placeholder="You are a helpful sales advisor at {businessName} who..."
        />
        <p className="text-[10px] text-muted-foreground">
          Use {"{businessName}"} where you want your business name inserted automatically.
        </p>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-foreground">Business rules</span>
        <textarea
          disabled={!canManage || saveMutation.isPending}
          value={draft.guardrailsText}
          onChange={(e) => updateDraft({ guardrailsText: e.target.value })}
          rows={5}
          className="w-full resize-y rounded-xl border border-input bg-card px-3 py-2 text-sm leading-relaxed"
          placeholder={"One rule per line\ne.g. Never invent prices not in our knowledge"}
        />
        <p className="text-[10px] text-muted-foreground">
          One rule per line. The AI must follow these in every reply.
        </p>
      </label>

      {saveMutation.isPending ? (
        <p className="text-[11px] text-muted-foreground">Saving persona…</p>
      ) : null}
    </div>
  );
}
