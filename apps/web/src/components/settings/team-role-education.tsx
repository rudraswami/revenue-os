"use client";

import { Info } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function TeamRoleEducationCard({
  variant,
  className,
}: {
  variant: "manager_self" | "manager_invite" | "team_invite";
  className?: string;
}) {
  const { t } = useI18n();
  const prefix = "settings.tabs.teamInvite.roleEducation";

  const titleKey =
    variant === "manager_self"
      ? `${prefix}.managerSelfTitle`
      : variant === "manager_invite"
        ? `${prefix}.managerInviteTitle`
        : `${prefix}.teamInviteTitle`;

  const bodyKey =
    variant === "manager_self"
      ? `${prefix}.managerSelfBody`
      : variant === "manager_invite"
        ? `${prefix}.managerInviteBody`
        : `${prefix}.teamInviteBody`;

  const canKey =
    variant === "manager_self" || variant === "manager_invite"
      ? `${prefix}.managerCan`
      : `${prefix}.teamCan`;

  const cannotKey =
    variant === "manager_self" || variant === "manager_invite"
      ? `${prefix}.managerCannot`
      : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-blue-200/70 bg-blue-50/60 px-4 py-3 text-sm text-blue-950",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" aria-hidden />
        <div className="min-w-0 space-y-2">
          <p className="font-semibold leading-snug">{t(titleKey)}</p>
          <p className="text-xs leading-relaxed text-blue-900/90">{t(bodyKey)}</p>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg bg-white/70 px-3 py-2">
              <p className="font-semibold text-blue-950">{t(`${prefix}.canLabel`)}</p>
              <p className="mt-1 leading-relaxed text-blue-900/85">{t(canKey)}</p>
            </div>
            {cannotKey && (
              <div className="rounded-lg bg-white/70 px-3 py-2">
                <p className="font-semibold text-blue-950">{t(`${prefix}.cannotLabel`)}</p>
                <p className="mt-1 leading-relaxed text-blue-900/85">{t(cannotKey)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
