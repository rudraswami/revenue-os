"use client";

import { Button } from "@/components/ui/button";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { cn } from "@/lib/utils";

export function InboxOwnershipStrip({
  aiEnabled,
  canToggle,
  togglePending,
  onTakeOver,
  onLetAiAssist,
  assigneeLabel,
  className,
}: {
  aiEnabled: boolean;
  canToggle: boolean;
  togglePending: boolean;
  onTakeOver: () => void;
  onLetAiAssist: () => void;
  assigneeLabel?: string | null;
  className?: string;
}) {
  const copy = useConversationsCopy();
  const humanOwned = !aiEnabled;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-t border-border/50 bg-muted/30 px-4 py-2 lg:px-5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Replying
        </p>
        <p className="truncate text-xs font-medium text-foreground">
          {humanOwned
            ? assigneeLabel
              ? `${assigneeLabel} · ${copy.handlingThisThread}`
              : copy.handlingThisThread
            : "Growvisi is assisting — you send every customer message"}
        </p>
      </div>

      {canToggle && (
        <div className="flex shrink-0 items-center gap-1.5">
          {humanOwned ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-lg px-3 text-xs font-semibold"
              isLoading={togglePending}
              onClick={onLetAiAssist}
            >
              {copy.letGrowvisiHelp}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-lg bg-warning px-3 text-xs font-semibold text-white hover:bg-warning"
              isLoading={togglePending}
              onClick={onTakeOver}
            >
              Take over
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
