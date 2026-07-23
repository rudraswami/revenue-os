"use client";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale-provider";

export type AgencyClientOwnerStatus = "owner_active" | "invite_pending" | "needs_owner";
export type AgencyClientTrialUrgency = "none" | "ending_soon" | "expired";

export interface AgencyClientLifecycle {
  ownerStatus: AgencyClientOwnerStatus;
  trialUrgency: AgencyClientTrialUrgency;
  isPaid: boolean;
}

function Chip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "warning" | "success" | "destructive";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
        tone === "neutral" && "border-border bg-background text-foreground/80",
        tone === "warning" && "border-warning/40 bg-warning/10 text-warning",
        tone === "success" && "border-[#25D366]/30 bg-[#25D366]/10 text-[#128C7E]",
        tone === "destructive" && "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {label}
    </span>
  );
}

/** Actionable lifecycle labels beyond connection status. */
export function AgencyClientLifecycleChips({ lifecycle }: { lifecycle: AgencyClientLifecycle }) {
  const { t } = useI18n();
  const chips: Array<{ key: string; label: string; tone: "neutral" | "warning" | "success" | "destructive" }> =
    [];

  if (lifecycle.isPaid) {
    chips.push({ key: "paid", label: t("agency.lifecyclePaid"), tone: "success" });
  } else if (lifecycle.trialUrgency === "expired") {
    chips.push({ key: "trial-expired", label: t("agency.lifecycleTrialExpired"), tone: "destructive" });
  } else if (lifecycle.trialUrgency === "ending_soon") {
    chips.push({ key: "trial-soon", label: t("agency.lifecycleTrialEnding"), tone: "warning" });
  }

  if (lifecycle.ownerStatus === "needs_owner") {
    chips.push({ key: "owner", label: t("agency.lifecycleNeedsOwner"), tone: "warning" });
  } else if (lifecycle.ownerStatus === "invite_pending") {
    chips.push({ key: "invite", label: t("agency.lifecycleInvitePending"), tone: "neutral" });
  }

  if (chips.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <Chip key={chip.key} label={chip.label} tone={chip.tone} />
      ))}
    </div>
  );
}
