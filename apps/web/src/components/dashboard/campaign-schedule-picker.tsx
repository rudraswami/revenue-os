"use client";

import { CalendarClock, Clock, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CampaignSaveMode = "draft" | "schedule";

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function defaultScheduleLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toDatetimeLocalValue(d);
}

export function localDatetimeToIso(local: string): string {
  return new Date(local).toISOString();
}

export function CampaignSchedulePicker({
  mode,
  onModeChange,
  scheduledLocal,
  onScheduledLocalChange,
  disabled,
  compact,
}: {
  mode: CampaignSaveMode;
  onModeChange: (mode: CampaignSaveMode) => void;
  scheduledLocal: string;
  onScheduledLocalChange: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        When to send
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onModeChange("draft")}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3 text-left transition",
            mode === "draft"
              ? "border-accent bg-bento-mint/50 ring-1 ring-accent/30"
              : "border-border/80 bg-card hover:border-accent/40",
          )}
        >
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              mode === "draft" ? "bg-accent text-white" : "bg-muted text-muted-foreground",
            )}
          >
            <Send className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Save as draft</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Review in your list, then send or schedule from the detail panel.
            </p>
          </div>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onModeChange("schedule")}
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3 text-left transition",
            mode === "schedule"
              ? "border-accent bg-bento-mint/50 ring-1 ring-accent/30"
              : "border-border/80 bg-card hover:border-accent/40",
          )}
        >
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              mode === "schedule" ? "bg-accent text-white" : "bg-muted text-muted-foreground",
            )}
          >
            <CalendarClock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Schedule send</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pick a date & time — Growvisi sends automatically (IST).
            </p>
          </div>
        </button>
      </div>

      {mode === "schedule" && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3">
          <label className="flex items-center gap-2 text-xs font-medium text-sky-900">
            <Clock className="h-3.5 w-3.5" />
            Send at (your local time)
          </label>
          <Input
            type="datetime-local"
            value={scheduledLocal}
            onChange={(e) => onScheduledLocalChange(e.target.value)}
            className="mt-2 h-10 bg-card text-sm"
            disabled={disabled}
            min={toDatetimeLocalValue(new Date(Date.now() + 6 * 60_000))}
          />
          <p className="mt-2 text-xs text-sky-800/80">
            Minimum 5 minutes ahead. Scheduled campaigns need an hourly cron on{" "}
            <code className="rounded bg-card/80 px-1">/internal/cron/scheduled-campaigns</code>.
          </p>
        </div>
      )}
    </div>
  );
}
