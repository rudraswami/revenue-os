"use client";

import { ShieldAlert, X } from "lucide-react";
import { ROLE_LABELS } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";

export function PermissionsChangedBanner() {
  const notice = useAuthStore((s) => s.roleChangeNotice);
  const clearRoleChangeNotice = useAuthStore((s) => s.clearRoleChangeNotice);

  if (!notice) return null;

  const fromLabel = ROLE_LABELS[notice.previousRole];
  const toLabel = ROLE_LABELS[notice.newRole];

  return (
    <div
      role="status"
      className="border-b border-amber-200/80 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-950"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <p className="min-w-0 flex-1 leading-snug">
          Your workspace role changed from <strong>{fromLabel}</strong> to{" "}
          <strong>{toLabel}</strong>. Some pages and actions may have updated — refresh if
          something looks off.
        </p>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1 text-amber-800/70 hover:bg-amber-100 hover:text-amber-900"
          aria-label="Dismiss"
          onClick={clearRoleChangeNotice}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
