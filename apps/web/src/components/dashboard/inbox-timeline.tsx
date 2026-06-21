"use client";

import { Clock, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface InboxTimelineEvent {
  id: string;
  type: "stage_change" | "ai_classify" | "automation";
  at: string;
  title: string;
  detail?: string;
}

export function InboxTimeline({
  events,
  aiConfidence,
  open,
  onToggle,
  className,
}: {
  events: InboxTimelineEvent[];
  aiConfidence: number | null | undefined;
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-l border-border/80 bg-white transition-[width] duration-200",
        open ? "w-64 xl:w-72" : "w-11",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/80 px-3 py-2.5">
        {open ? (
          <>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-accent" />
                <h2 className="text-sm font-bold">Timeline</h2>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                AI classification & pipeline
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
            title="Timeline"
          >
            <PanelRightOpen className="h-4 w-4 text-accent" />
          </Button>
        )}
      </div>

      {open && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 custom-scrollbar">
          {aiConfidence != null && (
            <div className="mb-3 rounded-xl bg-[#ecfdf5] px-3 py-2 text-[11px] font-semibold text-accent">
              AI confidence · {Math.round(aiConfidence * 100)}%
            </div>
          )}
          {!events.length && (
            <p className="rounded-xl border border-dashed border-[#dce9ff] bg-white px-3 py-4 text-center text-xs text-muted-foreground">
              Timeline fills in after the next message is classified.
            </p>
          )}
          <ul className="space-y-4">
            {events.map((ev) => (
              <li key={ev.id} className="relative border-l-2 border-accent/30 pl-4">
                <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-accent" />
                <p className="text-xs font-semibold">{ev.title}</p>
                {ev.detail && (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{ev.detail}</p>
                )}
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {new Date(ev.at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
