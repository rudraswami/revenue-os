"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRESETS = [
  "Price too high",
  "Chose competitor",
  "No response",
  "Not a fit",
  "Timing / postponed",
] as const;

export function LostReasonDialog({
  leadName,
  open,
  loading,
  onCancel,
  onConfirm,
}: {
  leadName?: string | null;
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-xl"
        role="dialog"
        aria-labelledby="lost-reason-title"
      >
        <h2 id="lost-reason-title" className="text-base font-bold">
          Why was this deal lost?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {leadName ? `Recording loss for ${leadName}. ` : ""}
          This helps your team spot patterns in lost revenue.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition hover:border-accent hover:bg-bento-mint/40"
            >
              {preset}
            </button>
          ))}
        </div>

        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Or type a custom reason…"
          className="mt-3 h-10 text-sm"
          autoFocus
        />

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={() => onConfirm(reason.trim() || "No reason given")}
          >
            Mark as lost
          </Button>
        </div>
      </div>
    </div>
  );
}
