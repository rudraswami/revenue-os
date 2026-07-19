"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BusinessEmployeeProfile,
  BusinessEmployeeProfilePatch,
  IntelligenceWorkspaceSettings,
  IntelligenceWorkspaceSettingsPatch,
} from "@growvisi/shared";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api-client";
import { canManageCampaigns } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

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

function FieldLabel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-foreground">{title}</span>
      {hint ? <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
      {children}
    </label>
  );
}

function ToggleRow({
  title,
  hint,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        {hint ? (
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={title}
      />
    </div>
  );
}

export function BusinessEmployeeProfileCard({
  variant = "full",
}: {
  variant?: "full" | "compact";
}) {
  const token = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const canManage = canManageCampaigns(role);
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(variant === "full");

  const { data, isLoading } = useQuery({
    queryKey: ["intelligence-settings"],
    queryFn: () =>
      apiFetch<IntelligenceWorkspaceSettings>("/organizations/intelligence-settings", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  useEffect(() => {
    if (data?.businessProfile) {
      setDraft(profileToDraft(data.businessProfile));
    }
  }, [data?.businessProfile]);

  const mutation = useMutation({
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
      success("Business profile saved.");
    },
    onError: () => toastError("Could not save business profile."),
  });

  function updateDraft<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  const dirty =
    draft &&
    data?.businessProfile &&
    JSON.stringify(draftToPatch(draft)) !==
      JSON.stringify({
        voice: data.businessProfile.voice,
        language: data.businessProfile.language,
        escalation: {
          contactName: data.businessProfile.escalation.contactName,
          contactPhone: data.businessProfile.escalation.contactPhone,
          slaMinutes: data.businessProfile.escalation.slaMinutes,
        },
        closeActions: data.businessProfile.closeActions,
        greetingVariants: data.businessProfile.greetingVariants,
      });

  return (
    <DashboardPanel
      title={variant === "compact" ? "Your greeting messages" : "How should Growvisi represent you?"}
      description={
        variant === "compact"
          ? "These are sent for Hi, Thanks, and simple replies. One greeting per line."
          : "Voice, greetings, and escalation details used when Growvisi drafts or sends simple replies on WhatsApp."
      }
      action={
        canManage ? (
          <Button
            size="sm"
            className="rounded-xl"
            disabled={!draft || !dirty || mutation.isPending}
            onClick={() =>
              draft && mutation.mutate({ businessProfile: draftToPatch(draft) })
            }
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        ) : null
      }
    >
      {isLoading || !draft ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          {variant === "compact" && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Step 3 · What should customers hear first?
            </p>
          )}

          <section className="space-y-3">
            {variant === "full" && (
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Greetings
              </p>
            )}
            <FieldLabel
              title="First message from a new customer"
              hint="One greeting per line. Use {businessName} for your shop name."
            >
              <textarea
                disabled={!canManage || mutation.isPending}
                value={draft.firstContactText}
                onChange={(e) => updateDraft("firstContactText", e.target.value)}
                rows={variant === "compact" ? 2 : 3}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
              />
            </FieldLabel>
            <FieldLabel
              title="When they message again"
              hint="Shorter is fine — e.g. “Hi! How can we help today?”"
            >
              <textarea
                disabled={!canManage || mutation.isPending}
                value={draft.returningText}
                onChange={(e) => updateDraft("returningText", e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
              />
            </FieldLabel>
          </section>

          {variant === "compact" && (
            <div className="border-t border-border/60 pt-2">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 py-2 text-left text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                <span>Voice, language &amp; escalation (optional)</span>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 transition", showAdvanced && "rotate-180")}
                />
              </button>
            </div>
          )}

          {(variant === "full" || showAdvanced) && (
            <>
              <section className="space-y-3 border-t border-border/60 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Voice
                </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldLabel title="Tone" hint="Casual for D2C; professional for B2B.">
                <Select
                  disabled={!canManage || mutation.isPending}
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
              </FieldLabel>
              <FieldLabel title="Emoji" hint="Sparingly adds warmth on greetings and thanks.">
                <Select
                  disabled={!canManage || mutation.isPending}
                  value={draft.voice.emoji}
                  onChange={(e) =>
                    updateDraft("voice", {
                      ...draft.voice,
                      emoji: e.target.value as ProfileDraft["voice"]["emoji"],
                    })
                  }
                >
                  <option value="sparingly">Sparingly</option>
                  <option value="none">None</option>
                </Select>
              </FieldLabel>
            </div>
            <ToggleRow
              title="Use customer's first name"
              hint="When we know it from WhatsApp or your pipeline."
              checked={draft.voice.useFirstName}
              disabled={!canManage || mutation.isPending}
              onCheckedChange={(useFirstName) =>
                updateDraft("voice", { ...draft.voice, useFirstName })
              }
            />
          </section>

          <section className="space-y-3 border-t border-border/60 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Language
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldLabel title="Default language">
                <Select
                  disabled={!canManage || mutation.isPending}
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
              </FieldLabel>
            </div>
            <ToggleRow
              title="Mirror customer's language"
              hint="Reply in Hindi or Hinglish when the customer writes that way."
              checked={draft.language.mirrorCustomer}
              disabled={!canManage || mutation.isPending}
              onCheckedChange={(mirrorCustomer) =>
                updateDraft("language", { ...draft.language, mirrorCustomer })
              }
            />
          </section>

          <section className="space-y-3 border-t border-border/60 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Escalation
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldLabel title="Contact name" hint="Shown when a human needs to take over.">
                <Input
                  disabled={!canManage || mutation.isPending}
                  value={draft.escalation.contactName}
                  onChange={(e) =>
                    updateDraft("escalation", {
                      ...draft.escalation,
                      contactName: e.target.value,
                    })
                  }
                  placeholder="e.g. Priya from sales"
                />
              </FieldLabel>
              <FieldLabel title="Contact phone" hint="Optional WhatsApp or call number.">
                <Input
                  disabled={!canManage || mutation.isPending}
                  value={draft.escalation.contactPhone ?? ""}
                  onChange={(e) =>
                    updateDraft("escalation", {
                      ...draft.escalation,
                      contactPhone: e.target.value,
                    })
                  }
                  placeholder="+91 98765 43210"
                />
              </FieldLabel>
            </div>
          </section>

          <section className="space-y-3 border-t border-border/60 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Close actions
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Links and numbers Growvisi can include when a customer is ready to pay, book, or call.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldLabel title="Payment link">
                <Input
                  disabled={!canManage || mutation.isPending}
                  value={draft.closeActions.paymentLink ?? ""}
                  onChange={(e) =>
                    updateDraft("closeActions", {
                      ...draft.closeActions,
                      paymentLink: e.target.value,
                    })
                  }
                  placeholder="https://razorpay.me/..."
                />
              </FieldLabel>
              <FieldLabel title="Booking URL">
                <Input
                  disabled={!canManage || mutation.isPending}
                  value={draft.closeActions.bookingUrl ?? ""}
                  onChange={(e) =>
                    updateDraft("closeActions", {
                      ...draft.closeActions,
                      bookingUrl: e.target.value,
                    })
                  }
                  placeholder="https://calendly.com/..."
                />
              </FieldLabel>
              <FieldLabel title="Call number">
                <Input
                  disabled={!canManage || mutation.isPending}
                  value={draft.closeActions.callNumber ?? ""}
                  onChange={(e) =>
                    updateDraft("closeActions", {
                      ...draft.closeActions,
                      callNumber: e.target.value,
                    })
                  }
                  placeholder="+91 98765 43210"
                />
              </FieldLabel>
            </div>
          </section>
            </>
          )}

          {!canManage && (
            <p className="text-xs text-muted-foreground">
              View-only access. Ask an admin or manager to update this profile.
            </p>
          )}
        </div>
      )}
    </DashboardPanel>
  );
}
