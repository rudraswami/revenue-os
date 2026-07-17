"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent size="md" showClose={false}>
        <DialogHeader>
          <DialogTitle>Why was this deal lost?</DialogTitle>
          <DialogDescription>
            {leadName ? `Recording loss for ${leadName}. ` : ""}
            This helps your team spot patterns in lost revenue.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
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
            className="h-10 text-sm"
            autoFocus
          />
        </DialogBody>
        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
