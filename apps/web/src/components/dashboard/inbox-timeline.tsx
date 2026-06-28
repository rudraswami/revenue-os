"use client";

import {
  ArrowRight,
  Bell,
  GitBranch,
  PanelRightClose,
  PanelRightOpen,
  ScanText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONVERSATIONS } from "@/lib/brand-copy";
import { STAGE_BADGE } from "@/lib/crm";
import type { LeadStage } from "@growvisi/shared";
import { formatStage } from "@/lib/stage-labels";
import { cn } from "@/lib/utils";

export interface InboxTimelineEvent {
  id: string;
  type: "stage_change" | "ai_classify" | "automation";
  at: string;
  title: string;
  detail?: string;
}

const TYPE_CONFIG = {
  stage_change: {
    label: "Pipeline",
    icon: GitBranch,
    dot: "bg-indigo-500",
    chip: "bg-indigo-50 text-indigo-700",
  },
  ai_classify: {
    label: "AI insight",
    icon: ScanText,
    dot: "bg-accent",
    chip: "bg-[#ecfdf5] text-accent",
  },
  automation: {
    label: "Automation",
    icon: Bell,
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-800",
  },
} as const;

function parseStageTitle(title: string): { from?: string; to?: string } {
  const arrow = title.match(/^(\w+)\s→\s(\w+)$/);
  if (arrow) return { from: arrow[1], to: arrow[2] };
  const set = title.match(/^Stage set to (\w+)$/i);
  if (set) return { to: set[1] };
  const auto = title.match(/^Automation moved stage to (\w+)$/i);
  if (auto) return { to: auto[1] };
  return {};
}

function StageChip({ stage, muted }: { stage: string; muted?: boolean }) {
  const badge = STAGE_BADGE[stage as LeadStage] ?? "bg-slate-100 text-slate-700";
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        badge,
        muted && "opacity-70",
      )}
    >
      {formatStage(stage)}
    </span>
  );
}

function formatTimelineDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return "Yesterday";
  }
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatTimelineTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function groupEventsByDate(events: InboxTimelineEvent[]) {
  const groups: { date: string; events: InboxTimelineEvent[] }[] = [];
  for (const ev of events) {
    const date = formatTimelineDate(ev.at);
    const last = groups[groups.length - 1];
    if (last?.date === date) last.events.push(ev);
    else groups.push({ date, events: [ev] });
  }
  return groups;
}

function TimelineEventCard({ ev }: { ev: InboxTimelineEvent }) {
  const config = TYPE_CONFIG[ev.type];
  const Icon = config.icon;
  const stages = ev.type === "stage_change" || ev.type === "automation" ? parseStageTitle(ev.title) : {};
  const showStageFlow = stages.from || stages.to;

  return (
    <li className="relative pl-0">
      <div className="rounded-xl border border-border/60 bg-white p-3 shadow-[0_1px_4px_rgb(11_28_48/0.04)] transition hover:border-border">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
              config.chip,
            )}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
          <time className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {formatTimelineTime(ev.at)}
          </time>
        </div>

        {showStageFlow ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {stages.from && <StageChip stage={stages.from} muted />}
            {stages.from && stages.to && (
              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
            )}
            {stages.to && <StageChip stage={stages.to} />}
          </div>
        ) : (
          <p className="text-xs font-semibold leading-snug text-foreground">{ev.title}</p>
        )}

        {ev.detail && (
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{ev.detail}</p>
        )}
      </div>
    </li>
  );
}

export function InboxTimeline({
  events,
  aiConfidence,
  open,
  onToggle,
  className,
  hasClassification,
}: {
  events: InboxTimelineEvent[];
  aiConfidence: number | null | undefined;
  open: boolean;
  onToggle: () => void;
  className?: string;
  hasClassification?: boolean;
}) {
  const groups = groupEventsByDate(events);
  const confidencePct = aiConfidence != null ? Math.round(aiConfidence * 100) : null;

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-l border-border/80 bg-[#f8f9ff]/50 transition-[width] duration-200",
        open ? "w-[17.5rem] xl:w-80" : "w-11",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/80 bg-white px-3 py-3">
        {open ? (
          <>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold tracking-tight">Deal timeline</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Pipeline moves & AI activity
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onToggle}
              aria-label="Collapse timeline"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mx-auto h-8 w-8"
            onClick={onToggle}
            aria-label="Expand timeline"
            title="Deal timeline"
          >
            <PanelRightOpen className="h-4 w-4 text-accent" />
          </Button>
        )}
      </div>

      {open && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 custom-scrollbar">
          {confidencePct != null && (
            <div className="mb-3 rounded-xl border border-accent/15 bg-white p-3 shadow-sm">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">AI confidence</span>
                <span className="font-bold tabular-nums text-accent">{confidencePct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#ecfdf5]">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
            </div>
          )}

          {!events.length && (
            <p className="rounded-xl border border-dashed border-border/80 bg-white px-3 py-5 text-center text-xs leading-relaxed text-muted-foreground">
              {hasClassification || aiConfidence != null
                ? CONVERSATIONS.timelineEmptyEvents
                : CONVERSATIONS.timelineEmptyClassify}
            </p>
          )}

          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.date}>
                <p className="sticky top-0 z-10 mb-2 bg-[#f8f9ff]/95 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                  {group.date}
                </p>
                <ul className="relative space-y-2.5">
                  <span
                    className="absolute bottom-1 left-[7px] top-1 w-px bg-border/80"
                    aria-hidden
                  />
                  {group.events.map((ev) => {
                    const config = TYPE_CONFIG[ev.type];
                    return (
                      <div key={ev.id} className="relative pl-5">
                        <span
                          className={cn(
                            "absolute left-0 top-4 z-[1] h-2.5 w-2.5 rounded-full ring-2 ring-[#f8f9ff]",
                            config.dot,
                          )}
                        />
                        <TimelineEventCard ev={ev} />
                      </div>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
