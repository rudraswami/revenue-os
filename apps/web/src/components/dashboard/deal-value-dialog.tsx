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

export function DealValueDialog({
  leadName,
  currentValueCents,
  open,
  loading,
  onCancel,
  onConfirm,
}: {
  leadName?: string | null;
  currentValueCents: number | null;
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (valueCents: number | null) => void;
}) {
  const [raw, setRaw] = useState("");

  const initial =
    raw ||
    (currentValueCents != null ? String(Math.round(currentValueCents / 100)) : "");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent size="sm" showClose={false}>
        <DialogHeader>
          <DialogTitle>Deal value</DialogTitle>
          <DialogDescription>
            {leadName ? `For ${leadName}. ` : ""}
            Track pipeline ₹ — used in revenue metrics.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ₹
            </span>
            <Input
              value={initial}
              onChange={(e) => setRaw(e.target.value.replace(/[^\d,]/g, ""))}
              placeholder="e.g. 5000"
              className="h-10 pl-7 text-sm"
              inputMode="numeric"
              autoFocus
            />
          </div>
        </DialogBody>
        <DialogFooter className="justify-between">
          {currentValueCents != null ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={loading}
              onClick={() => onConfirm(null)}
            >
              Clear value
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={() => {
                const trimmed = initial.trim().replace(/,/g, "");
                if (!trimmed) {
                  onConfirm(null);
                  return;
                }
                const rupees = Number(trimmed);
                if (!Number.isFinite(rupees) || rupees < 0) return;
                onConfirm(Math.round(rupees * 100));
              }}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
