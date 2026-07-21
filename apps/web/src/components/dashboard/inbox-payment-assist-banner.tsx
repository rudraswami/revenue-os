"use client";

import { Button } from "@/components/ui/button";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { cn } from "@/lib/utils";

export function InboxPaymentAssistBanner({
  onMarkWon,
  onDismiss,
  className,
}: {
  onMarkWon?: () => void;
  onDismiss?: () => void;
  className?: string;
}) {
  const copy = useConversationsCopy();

  return (
    <div
      className={cn(
        "mb-3 flex flex-col gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-xs text-success sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div>
        <p className="font-semibold">{copy.paymentAssistTitle}</p>
        <p className="mt-0.5 text-success">{copy.paymentAssistHint}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {onMarkWon && (
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg bg-success text-xs hover:bg-success"
            onClick={onMarkWon}
          >
            {copy.paymentAssistMarkWon}
          </Button>
        )}
        {onDismiss && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-success"
            onClick={onDismiss}
          >
            {copy.paymentAssistDismiss}
          </Button>
        )}
      </div>
    </div>
  );
}
