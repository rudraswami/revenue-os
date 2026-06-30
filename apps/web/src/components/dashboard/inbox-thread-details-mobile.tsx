"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { LeadStage } from "@growvisi/shared";
import { LEAD_STAGES, STAGE_BADGE } from "@/lib/crm";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { cn } from "@/lib/utils";

interface TeamMember {
  user: { id: string; name: string | null; email: string };
}

export function InboxThreadDetailsMobile({
  stage,
  score,
  assignedToId,
  teamMembers,
  canEditStage,
  stagePending,
  assignPending,
  onStageChange,
  onAssign,
}: {
  stage?: LeadStage;
  score?: number;
  assignedToId: string | null;
  teamMembers: TeamMember[];
  canEditStage: boolean;
  stagePending: boolean;
  assignPending: boolean;
  onStageChange: (stage: LeadStage) => void;
  onAssign: (userId: string | null) => void;
}) {
  const copy = useConversationsCopy();
  const [open, setOpen] = useState(false);
  const leadScore = score ?? 0;

  return (
    <div className="border-b border-border/60 bg-[#fafbff] px-4 py-2 md:hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-xs font-semibold text-foreground"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          {stage ? copy.stageLabel(stage) : copy.assignedTo}
          {leadScore > 0 ? ` · ${leadScore}` : ""}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-3 grid gap-3 pb-2">
          {stage && canEditStage && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Pipeline stage
              </label>
              <select
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-sm font-medium",
                  STAGE_BADGE[stage],
                )}
                value={stage}
                disabled={stagePending}
                onChange={(e) => onStageChange(e.target.value as LeadStage)}
              >
                {LEAD_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {copy.stageLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label
              htmlFor="mobile-assign-agent"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {copy.assignedTo}
            </label>
            <select
              id="mobile-assign-agent"
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
              value={assignedToId ?? ""}
              disabled={assignPending}
              onChange={(e) => onAssign(e.target.value || null)}
            >
              <option value="">{copy.unassigned}</option>
              {teamMembers.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name ?? m.user.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
