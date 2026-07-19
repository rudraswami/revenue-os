"use client";

import { CalendarClock, Clock, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CampaignSaveMode = "draft" | "schedule";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istYmdHm(d: Date): { y: number; m: number; day: number; h: number; min: number } {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return {
    y: ist.getUTCFullYear(),
    m: ist.getUTCMonth() + 1,
    day: ist.getUTCDate(),
    h: ist.getUTCHours(),
    min: ist.getUTCMinutes(),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Datetime-local value interpreted as IST (India Standard Time). */
export function toDatetimeLocalValueIst(d: Date): string {
  const { y, m, day, h, min } = istYmdHm(d);
  return `${y}-${pad(m)}-${pad(day)}T${pad(h)}:${pad(min)}`;
}

export function defaultScheduleLocal(): string {
  const now = new Date();
  const { y, m, day } = istYmdHm(now);
  const tomorrow = new Date(Date.UTC(y, m - 1, day + 1, 4, 30, 0));
  return toDatetimeLocalValueIst(tomorrow);
}

/** Parse datetime-local as IST and return ISO UTC. */
export function localDatetimeToIso(local: string): string {
  if (!local?.includes("T")) return new Date(local).toISOString();
  return new Date(`${local}:00+05:30`).toISOString();
}

export function formatIstPreview(local: string): string | null {
  if (!local?.includes("T")) return null;
  try {
    const iso = localDatetimeToIso(local);
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
}

/** @deprecated Use toDatetimeLocalValueIst — kept for detail reschedule inputs. */
export function toDatetimeLocalValue(d: Date): string {
  return toDatetimeLocalValueIst(d);
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
  const istPreview = formatIstPreview(scheduledLocal);
  const minLocal = toDatetimeLocalValueIst(new Date(Date.now() + 6 * 60_000));

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <p className="text-xs font-medium text-muted-foreground">When to send</p>
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
              Pick date & time in IST — Growvisi sends automatically.
            </p>
          </div>
        </button>
      </div>

      {mode === "schedule" && (
        <div className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50/90 to-background p-3">
          <label className="flex items-center gap-2 text-xs font-medium text-sky-900">
            <Clock className="h-3.5 w-3.5" />
            Send at (India Standard Time)
          </label>
          <Input
            type="datetime-local"
            value={scheduledLocal}
            onChange={(e) => onScheduledLocalChange(e.target.value)}
            className="mt-2 h-10 bg-card text-sm"
            disabled={disabled}
            min={minLocal}
          />
          {istPreview && (
            <p className="mt-2 text-sm font-medium text-sky-950">
              Sends {istPreview} IST
            </p>
          )}
          <p className="mt-1 text-xs text-sky-800/80">
            Minimum 5 minutes ahead. Times are always interpreted as IST (UTC+5:30).
          </p>
        </div>
      )}
    </div>
  );
}
