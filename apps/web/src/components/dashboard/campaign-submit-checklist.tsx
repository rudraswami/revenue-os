"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CampaignSubmitChecklistItem {
  id: string;
  label: string;
  done: boolean;
  hint?: string;
}

export function CampaignSubmitChecklist({
  items,
  className,
}: {
  items: CampaignSubmitChecklistItem[];
  className?: string;
}) {
  const doneCount = items.filter((i) => i.done).length;
  const ready = doneCount === items.length;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        ready
          ? "border-accent/30 bg-bento-mint/40"
          : "border-border/80 bg-muted/30",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Ready to save
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-bold",
            ready ? "bg-accent text-white" : "bg-muted text-muted-foreground",
          )}
        >
          {doneCount}/{items.length}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5 text-sm">
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                item.done ? "bg-accent text-white" : "bg-card text-muted-foreground ring-1 ring-border",
              )}
            >
              {item.done ? (
                <Check className="h-3 w-3" strokeWidth={3} />
              ) : (
                <Circle className="h-2 w-2 fill-current" />
              )}
            </span>
            <div className="min-w-0">
              <p className={cn("font-medium", item.done ? "text-foreground" : "text-muted-foreground")}>
                {item.label}
              </p>
              {!item.done && item.hint && (
                <p className="text-xs text-muted-foreground">{item.hint}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
