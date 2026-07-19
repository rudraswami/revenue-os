"use client";

import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { formatRelationshipPhase, type WorkingMemory } from "@growvisi/shared";
import { Button } from "@/components/ui/button";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { cn } from "@/lib/utils";

export interface InboxTimelineEvent {
  id: string;
  type: "stage_change" | "ai_classify" | "automation";
  at: string;
  title: string;
  detail?: string;
}

function parseStageTitle(title: string): { from?: string; to?: string } {
  const arrow = title.match(/^(\w+)\s→\s(\w+)$/);
  if (arrow) return { from: arrow[1], to: arrow[2] };
  const set = title.match(/^Stage set to (\w+)$/i);
  if (set) return { to: set[1] };
  const auto = title.match(/^Automation moved stage to (\w+)$/i);
  if (auto) return { to: auto[1] };
  return {};
}

function formatTimelineDate(iso: string, locale: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return locale === "hi" ? "आज" : "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return locale === "hi" ? "कल" : "Yesterday";
  }
  return d.toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimelineTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale === "hi" ? "hi-IN" : "en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dedupeEvents(events: InboxTimelineEvent[]) {
  return events.filter((ev, i) => {
    if (i === 0) return true;
    const prev = events[i - 1];
    return prev.title !== ev.title || prev.detail !== ev.detail;
  });
}

function groupEventsByDate(events: InboxTimelineEvent[], locale: string) {
  const groups: { date: string; events: InboxTimelineEvent[] }[] = [];
  for (const ev of events) {
    const date = formatTimelineDate(ev.at, locale);
    const last = groups[groups.length - 1];
    if (last?.date === date) last.events.push(ev);
    else groups.push({ date, events: [ev] });
  }
  return groups;
}

function TimelineRow({
  ev,
  headline,
  detail,
  locale,
}: {
  ev: InboxTimelineEvent;
  headline: string;
  detail?: string;
  locale: string;
}) {
  return (
    <li className="grid grid-cols-[3.25rem_1fr] gap-x-2 gap-y-0.5 border-b border-border/50 py-2.5 last:border-0">
      <time className="pt-0.5 text-xs tabular-nums leading-tight text-muted-foreground">
        {formatTimelineTime(ev.at, locale)}
      </time>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug text-foreground">{headline}</p>
        {detail && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
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
  workingMemory,
}: {
  events: InboxTimelineEvent[];
  aiConfidence: number | null | undefined;
  open: boolean;
  onToggle: () => void;
  className?: string;
  hasClassification?: boolean;
  workingMemory?: WorkingMemory | null;
}) {
  const copy = useConversationsCopy();
  const cleaned = dedupeEvents(events);
  const groups = groupEventsByDate(cleaned, copy.locale);
  const confidencePct = aiConfidence != null ? Math.round(aiConfidence * 100) : null;

  function eventHeadline(ev: InboxTimelineEvent): string {
    const stages =
      ev.type === "stage_change" || ev.type === "automation" ? parseStageTitle(ev.title) : {};

    if (stages.to) {
      const to = copy.stageLabel(stages.to);
      if (stages.from) {
        const from = copy.stageLabel(stages.from);
        return copy.timelineHeadline.moved(from, to);
      }
      return ev.type === "automation"
        ? copy.timelineHeadline.autoMovedTo(to)
        : copy.timelineHeadline.setTo(to);
    }

    if (ev.type === "ai_classify") return copy.timelineHeadline.aiReviewed;

    const titles: Record<string, string> = {
      "Hot lead alert emailed": copy.timelineHeadline.hotLeadAlert,
      "Follow-up reminder sent": copy.timelineHeadline.followupReminder,
    };
    return titles[ev.title] ?? ev.title;
  }

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-l border-border/80 bg-card transition-[width] duration-200",
        open ? "w-[15.5rem] xl:w-72" : "w-11",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/80 px-3 py-3">
        {open ? (
          <>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                {copy.timelineTitle}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{copy.timelineSubtitle}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              onClick={onToggle}
              aria-label="Collapse activity"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mx-auto h-8 w-8 text-muted-foreground"
            onClick={onToggle}
            aria-label="Expand activity"
            title={copy.timelineTitle}
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        )}
      </div>

      {open && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 custom-scrollbar">
          {workingMemory && (
            <div className="mb-3 space-y-2 border-b border-border/50 pb-3">
              <p className="text-xs font-semibold text-foreground">What Growvisi knows</p>
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">
                  {formatRelationshipPhase(workingMemory.relationshipPhase)}
                </span>
                <span className="capitalize">
                  {" "}
                  · {workingMemory.engagementPhase.replace(/_/g, " ")}
                </span>
                {workingMemory.customerCard.language
                  ? ` · ${workingMemory.customerCard.language}`
                  : ""}
              </p>
              {workingMemory.customerCard.lastSummary ? (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {workingMemory.customerCard.lastSummary}
                </p>
              ) : null}
              {workingMemory.lastQuotedAmount ? (
                <p className="text-[11px] text-muted-foreground">
                  Last quoted: {workingMemory.lastQuotedAmount}
                </p>
              ) : null}
              {workingMemory.contradictionFlags.length > 0 ? (
                <p className="text-[11px] font-medium text-amber-800">
                  {workingMemory.contradictionFlags.join(", ").replace(/_/g, " ")}
                </p>
              ) : null}
            </div>
          )}

          {confidencePct != null && (
            <div className="mb-3 border-b border-border/50 pb-3">
              <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>{copy.timelineConfidence}</span>
                <span className="tabular-nums font-medium text-foreground">{confidencePct}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground/30"
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
            </div>
          )}

          {!cleaned.length && (
            <p className="px-1 py-6 text-center text-xs leading-relaxed text-muted-foreground">
              {hasClassification || aiConfidence != null
                ? copy.timelineEmptyEvents
                : copy.timelineEmptyClassify}
            </p>
          )}

          <div className="space-y-3">
            {groups.map((group) => (
              <section key={group.date}>
                <p className="mb-1 px-0.5 text-xs font-medium text-muted-foreground/80">
                  {group.date}
                </p>
                <ul>
                  {group.events.map((ev) => (
                    <TimelineRow
                      key={ev.id}
                      ev={ev}
                      headline={eventHeadline(ev)}
                      detail={copy.humanizeDetail(ev.detail)}
                      locale={copy.locale}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
