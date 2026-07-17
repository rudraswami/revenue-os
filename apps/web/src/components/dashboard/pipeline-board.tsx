"use client";

import Link from "next/link";
import { useState } from "react";
import { GripVertical } from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { cn } from "@/lib/utils";
import { readableOn } from "@/lib/crm";
import { CONVERSATIONS } from "@/lib/brand-copy";
import type { LeadStage } from "@growvisi/shared";

export interface PipelineLead {
  id: string;
  displayName: string | null;
  phone: string;
  score: number;
  stage: LeadStage;
  valueCents: number | null;
  currency?: string;
  ownerId: string | null;
  owner: { id: string; name: string } | null;
  profile: { lastIntent?: string | null; nextAction?: string | null };
  daysInStage: number;
  isHot: boolean;
  isStale: boolean;
  staleLabel: string | null;
  waitingOnTeam: boolean;
  conversation: { id: string; unreadCount: number; lastInboundAt: string | null } | null;
  tags?: Array<{ id: string; name: string; color: string }>;
}

interface PipelineBoardProps {
  stages: LeadStage[];
  stageLabels: Record<LeadStage, string>;
  stageColors: Record<LeadStage, string>;
  data: Record<string, PipelineLead[]> | undefined;
  isPending: boolean;
  onMoveLead: (leadId: string, stage: LeadStage) => void;
  onEditValue?: (lead: PipelineLead) => void;
}

function formatInr(cents: number) {
  return `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function columnValueCents(leads: PipelineLead[]) {
  return leads.reduce((sum, l) => sum + (l.valueCents ?? 0), 0);
}

function LeadCard({
  lead,
  stages,
  stageLabels,
  isPending,
  draggingId,
  onDragStart,
  onDragEnd,
  onMoveLead,
  onEditValue,
}: {
  lead: PipelineLead;
  stages: LeadStage[];
  stageLabels: Record<LeadStage, string>;
  isPending: boolean;
  draggingId: string | null;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragEnd: () => void;
  onMoveLead: (leadId: string, stage: LeadStage) => void;
  onEditValue?: (lead: PipelineLead) => void;
}) {
  return (
    <div
      draggable={!isPending}
      onDragStart={(e) => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-2xl border bg-card p-3.5 shadow-[0_2px_12px_rgb(11_28_48/0.04)] transition-all md:cursor-grab md:active:cursor-grabbing",
        lead.isHot && "border-accent/25 ring-1 ring-accent/10",
        lead.isStale && !lead.isHot && "border-amber-200/80 ring-1 ring-amber-100",
        !lead.isHot && !lead.isStale && "border-border",
        draggingId === lead.id && "scale-[1.02] opacity-60 shadow-lg ring-2 ring-accent/30",
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-2.5 hidden h-4 w-4 shrink-0 text-muted-foreground/35 md:block" />
        <AvatarInitials name={lead.displayName ?? lead.phone} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold leading-snug">
              {lead.displayName ?? lead.phone}
            </p>
            {lead.score > 0 && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums",
                  lead.isHot ? "bg-bento-mint text-accent" : "bg-background text-muted-foreground",
                )}
              >
                {lead.score}
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap gap-1">
            {lead.isHot && (
              <span className="rounded-full bg-bento-mint px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-accent">
                Hot
              </span>
            )}
            {lead.waitingOnTeam && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-700">
                {CONVERSATIONS.waitingOnYou}
              </span>
            )}
            {lead.isStale && lead.staleLabel && (
              <span className="rounded-full bg-amber-50/80 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {lead.staleLabel}
              </span>
            )}
          </div>

          {lead.profile.lastIntent && (
            <p className="mt-1.5 truncate text-xs text-muted-foreground">
              {lead.profile.lastIntent}
            </p>
          )}

          {lead.tags && lead.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {lead.tags.slice(0, 2).map((t) => (
                <span
                  key={t.id}
                  className="rounded-full px-1.5 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: t.color, color: readableOn(t.color) }}
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2.5 md:pl-6">
        <div className="md:hidden">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Stage
          </label>
          <select
            className="w-full rounded-xl border border-border bg-background px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={lead.stage}
            disabled={isPending}
            onChange={(e) => {
              const next = e.target.value as LeadStage;
              if (next !== lead.stage) onMoveLead(lead.id, next);
            }}
          >
            {stages.map((s) => (
              <option key={s} value={s}>
                {stageLabels[s]}
              </option>
            ))}
          </select>
        </div>

        {lead.profile.nextAction && (
          <p className="text-xs leading-snug text-foreground/75">
            <span className="font-semibold text-muted-foreground">Next: </span>
            {lead.profile.nextAction}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
          <div className="flex items-center gap-2">
            {onEditValue && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-accent"
                disabled={isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditValue(lead);
                }}
              >
                {lead.valueCents != null ? (
                  <span className="font-semibold text-foreground">{formatInr(lead.valueCents)}</span>
                ) : (
                  "+ Deal value"
                )}
              </button>
            )}
            {lead.owner && (
              <span className="text-xs text-muted-foreground">· {lead.owner.name}</span>
            )}
          </div>
          {lead.conversation?.id ? (
            <Link
              href={`/dashboard/inbox?c=${lead.conversation.id}`}
              className="text-xs font-semibold text-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Open chat →
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">No chat</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function PipelineBoard({
  stages,
  stageLabels,
  stageColors,
  data,
  isPending,
  onMoveLead,
  onEditValue,
}: PipelineBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<LeadStage | null>(null);

  function handleDragStart(e: React.DragEvent, leadId: string) {
    setDraggingId(leadId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", leadId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropTarget(null);
  }

  function handleDragOver(e: React.DragEvent, stage: LeadStage) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(stage);
  }

  function handleDrop(e: React.DragEvent, targetStage: LeadStage) {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;
    const lead = stages.flatMap((s) => data?.[s] ?? []).find((l) => l.id === leadId);
    if (lead && lead.stage !== targetStage) onMoveLead(leadId, targetStage);
    setDraggingId(null);
    setDropTarget(null);
  }

  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground md:hidden">
        Use the stage dropdown on each card.
      </p>
      <p className="mb-4 hidden text-xs text-muted-foreground md:block">
        Drag cards between columns — AI scoring and automations keep stages in sync.
      </p>
      <div className="flex flex-1 gap-3 overflow-x-auto pb-4 custom-scrollbar">
        {stages.map((stage) => {
          const columnLeads = data?.[stage] ?? [];
          const count = columnLeads.length;
          const colValue = columnValueCents(columnLeads);
          return (
            <div
              key={stage}
              className="min-w-[272px] shrink-0"
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className="mb-2.5 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
                <div className={cn("h-2 w-2 shrink-0 rounded-full", stageColors[stage])} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="truncate text-sm font-bold">{stageLabels[stage]}</h2>
                    <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-bold tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </div>
                  {colValue > 0 && (
                    <p className="mt-0.5 text-xs font-semibold text-accent">
                      {formatInr(colValue)}
                    </p>
                  )}
                </div>
              </div>
              <div
                className={cn(
                  "min-h-[260px] space-y-2.5 rounded-2xl border-2 border-dashed p-2 transition-colors",
                  dropTarget === stage
                    ? "border-accent/40 bg-bento-mint/50"
                    : "border-transparent bg-background/80",
                )}
              >
                {columnLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    stages={stages}
                    stageLabels={stageLabels}
                    isPending={isPending}
                    draggingId={draggingId}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onMoveLead={onMoveLead}
                    onEditValue={onEditValue}
                  />
                ))}
                {count === 0 && (
                  <p className="hidden px-2 py-10 text-center text-xs text-muted-foreground md:block">
                    Drop leads here
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
