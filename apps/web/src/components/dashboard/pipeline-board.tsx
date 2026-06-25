"use client";

import Link from "next/link";
import { useState } from "react";
import { GripVertical } from "lucide-react";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { cn } from "@/lib/utils";
import { readableOn } from "@/lib/crm";
import type { LeadStage } from "@growvisi/shared";

export interface PipelineLead {
  id: string;
  displayName: string | null;
  phone: string;
  score: number;
  stage: LeadStage;
  valueCents: number | null;
  currency?: string;
  conversation: { id: string } | null;
  tags?: Array<{ id: string; name: string; color: string }>;
}

interface PipelineBoardProps {
  stages: LeadStage[];
  stageLabels: Record<LeadStage, string>;
  stageColors: Record<LeadStage, string>;
  data: Record<string, PipelineLead[]> | undefined;
  isPending: boolean;
  onMoveLead: (leadId: string, stage: LeadStage) => void;
  onUpdateValue?: (leadId: string, valueCents: number | null) => void;
}

function scoreTone(score: number) {
  if (score >= 80) return "text-accent font-bold";
  if (score >= 50) return "text-foreground font-semibold";
  return "text-muted-foreground";
}

function formatInr(cents: number) {
  return `₹${(cents / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
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
  onUpdateValue,
}: {
  lead: PipelineLead;
  stages: LeadStage[];
  stageLabels: Record<LeadStage, string>;
  isPending: boolean;
  draggingId: string | null;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragEnd: () => void;
  onMoveLead: (leadId: string, stage: LeadStage) => void;
  onUpdateValue?: (leadId: string, valueCents: number | null) => void;
}) {
  const hot = lead.score >= 80;

  return (
    <div
      draggable={!isPending}
      onDragStart={(e) => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-2xl border bg-white p-3.5 shadow-[0_2px_12px_rgb(11_28_48/0.04)] transition-all md:cursor-grab md:active:cursor-grabbing",
        hot ? "border-accent/25 ring-1 ring-accent/10" : "border-[#dce9ff]",
        draggingId === lead.id && "scale-[1.02] opacity-60 shadow-lg ring-2 ring-accent/30",
      )}
    >
      <div className="flex items-start gap-2.5">
        <GripVertical className="mt-2 hidden h-4 w-4 shrink-0 text-muted-foreground/40 md:block" />
        <AvatarInitials name={lead.displayName ?? lead.phone} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-snug">{lead.displayName ?? lead.phone}</p>
          {hot && (
            <span className="mt-1 inline-block rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
              Hot · {lead.score}
            </span>
          )}
          {lead.tags && lead.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {lead.tags.slice(0, 3).map((t) => (
                <span
                  key={t.id}
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                  style={{ backgroundColor: t.color, color: readableOn(t.color) }}
                >
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-3 md:pl-7">
        <div className="md:hidden">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Stage
          </label>
          <select
            className="w-full rounded-xl border border-[#dce9ff] bg-[#f8f9ff] px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/30"
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

        {lead.score > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e5eeff]">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.min(lead.score, 100)}%` }}
              />
            </div>
            <span className={cn("text-[10px] tabular-nums", scoreTone(lead.score))}>{lead.score}</span>
          </div>
        )}

        {onUpdateValue && (
          <button
            type="button"
            className="text-left text-xs text-muted-foreground hover:text-accent"
            disabled={isPending}
            onClick={(e) => {
              e.stopPropagation();
              const current =
                lead.valueCents != null ? String(Math.round(lead.valueCents / 100)) : "";
              const raw = window.prompt("Deal value in ₹ (leave empty to clear)", current);
              if (raw === null) return;
              const trimmed = raw.trim();
              if (!trimmed) {
                onUpdateValue(lead.id, null);
                return;
              }
              const rupees = Number(trimmed.replace(/,/g, ""));
              if (!Number.isFinite(rupees) || rupees < 0) return;
              onUpdateValue(lead.id, Math.round(rupees * 100));
            }}
          >
            {lead.valueCents != null ? (
              <span className="font-semibold text-foreground">{formatInr(lead.valueCents)}</span>
            ) : (
              "+ Add deal value"
            )}
          </button>
        )}

        {lead.conversation?.id ? (
          <Link
            href={`/dashboard/inbox?c=${lead.conversation.id}`}
            className="inline-flex text-xs font-semibold text-accent hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Open chat →
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">No chat linked</span>
        )}
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
  onUpdateValue,
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
      <p className="mb-4 text-xs text-muted-foreground md:hidden">Use the stage dropdown on each card.</p>
      <p className="mb-4 hidden text-xs text-muted-foreground md:block">Drag cards between columns — stages sync to WhatsApp leads.</p>
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {stages.map((stage) => {
          const count = data?.[stage]?.length ?? 0;
          return (
            <div
              key={stage}
              className="min-w-[280px] shrink-0"
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={() => setDropTarget(null)}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#dce9ff] bg-white px-3 py-2 shadow-sm">
                <div className={cn("h-2.5 w-2.5 rounded-full", stageColors[stage])} />
                <h2 className="text-sm font-bold">{stageLabels[stage]}</h2>
                <span className="ml-auto rounded-full bg-[#f8f9ff] px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                  {count}
                </span>
              </div>
              <div
                className={cn(
                  "min-h-[280px] space-y-2.5 rounded-2xl border-2 border-dashed p-2 transition-colors",
                  dropTarget === stage
                    ? "border-accent/40 bg-[#ecfdf5]/50"
                    : "border-transparent bg-[#f8f9ff]/80",
                )}
              >
                {(data?.[stage] ?? []).map((lead) => (
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
                    onUpdateValue={onUpdateValue}
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
