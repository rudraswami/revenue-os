"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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

  if (!open) return null;

  const initial =
    raw ||
    (currentValueCents != null ? String(Math.round(currentValueCents / 100)) : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-white p-5 shadow-xl"
        role="dialog"
        aria-labelledby="deal-value-title"
      >
        <h2 id="deal-value-title" className="text-base font-bold">
          Deal value
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {leadName ? `For ${leadName}. ` : ""}
          Track pipeline ₹ — used in revenue metrics.
        </p>

        <div className="relative mt-3">
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

        <div className="mt-4 flex justify-between gap-2">
          {currentValueCents != null && (
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
          )}
          <div className="ml-auto flex gap-2">
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
        </div>
      </div>
    </div>
  );
}
