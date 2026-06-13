"use client";

import Link from "next/link";
import { useState } from "react";
import { GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeadStage } from "@growthsync/shared";

export interface PipelineLead {
  id: string;
  displayName: string | null;
  phone: string;
  score: number;
  stage: LeadStage;
  conversation: { id: string } | null;
}

interface PipelineBoardProps {
  stages: LeadStage[];
  stageLabels: Record<LeadStage, string>;
  stageColors: Record<LeadStage, string>;
  data: Record<string, PipelineLead[]> | undefined;
  isPending: boolean;
  onMoveLead: (leadId: string, stage: LeadStage) => void;
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
}: {
  lead: PipelineLead;
  stages: LeadStage[];
  stageLabels: Record<LeadStage, string>;
  isPending: boolean;
  draggingId: string | null;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragEnd: () => void;
  onMoveLead: (leadId: string, stage: LeadStage) => void;
}) {
  return (
    <Card
      draggable={!isPending}
      onDragStart={(e) => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "transition-shadow md:cursor-grab md:active:cursor-grabbing",
        draggingId === lead.id && "opacity-50 shadow-lg ring-2 ring-primary/40",
      )}
    >
      <CardHeader className="flex flex-row items-start gap-2 p-4 pb-2">
        <GripVertical className="mt-0.5 hidden h-4 w-4 shrink-0 text-muted-foreground/50 md:block" />
        <CardTitle className="text-sm leading-snug">{lead.displayName ?? lead.phone}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 md:pl-10">
        {/* Mobile / touch: stage picker */}
        <div className="md:hidden">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Move to stage
          </label>
          <select
            className="w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
            <div className="h-1.5 flex-1 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(lead.score, 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">{lead.score}</span>
          </div>
        )}
        {lead.conversation?.id ? (
          <Link
            href={`/dashboard/inbox?c=${lead.conversation.id}`}
            className="block text-xs font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Open chat →
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">No chat linked</span>
        )}
      </CardContent>
    </Card>
  );
}

export function PipelineBoard({
  stages,
  stageLabels,
  stageColors,
  data,
  isPending,
  onMoveLead,
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
    if (lead && lead.stage !== targetStage) {
      onMoveLead(leadId, targetStage);
    }
    setDraggingId(null);
    setDropTarget(null);
  }

  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground md:hidden">
        Use the stage dropdown on each card to move leads.
      </p>
      <p className="mb-4 hidden text-xs text-muted-foreground md:block">
        Drag cards between columns to update stages.
      </p>
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4 custom-scrollbar">
        {stages.map((stage) => (
          <div
            key={stage}
            className="min-w-[272px] shrink-0"
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={() => setDropTarget(null)}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full", stageColors[stage])} />
              <h2 className="text-sm font-semibold">{stageLabels[stage]}</h2>
              <span className="ml-auto rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground shadow-sm">
                {data?.[stage]?.length ?? 0}
              </span>
            </div>
            <div
              className={cn(
                "min-h-[240px] space-y-2 rounded-xl p-2 transition-colors",
                dropTarget === stage ? "bg-primary/10 ring-2 ring-primary/30" : "bg-muted/50",
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
                />
              ))}
              {(data?.[stage]?.length ?? 0) === 0 && (
                <p className="hidden px-2 py-8 text-center text-xs text-muted-foreground md:block">
                  Drop leads here
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
