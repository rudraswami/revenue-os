"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatInr } from "@/lib/crm";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import type { InboxAiContext } from "@/components/dashboard/inbox-ai-panel";

export function InboxHandoffPackageDialog({
  open,
  onOpenChange,
  assigneeName,
  contactLabel,
  stageLabel,
  dealValueCents,
  aiContext,
  recentSnippet,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assigneeName: string;
  contactLabel: string;
  stageLabel?: string;
  dealValueCents?: number | null;
  aiContext?: InboxAiContext | null;
  recentSnippet?: string | null;
  pending?: boolean;
  onConfirm: () => void;
}) {
  const copy = useConversationsCopy();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{copy.handoffPackageTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {copy.handoffPackageHint(assigneeName, contactLabel)}
          </p>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {aiContext?.summary && (
            <div className="rounded-xl border border-accent/15 bg-accent/5 p-3">
              <p className="text-xs font-semibold text-accent">{copy.aiBriefTitle}</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{aiContext.summary}</p>
              {aiContext.nextAction && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{copy.aiBriefNext}:</span>{" "}
                  {aiContext.nextAction}
                </p>
              )}
            </div>
          )}
          <dl className="grid grid-cols-2 gap-2 text-xs">
            {stageLabel && (
              <>
                <dt className="text-muted-foreground">{copy.handoffPackageStage}</dt>
                <dd className="font-medium text-foreground">{stageLabel}</dd>
              </>
            )}
            {dealValueCents != null && dealValueCents > 0 && (
              <>
                <dt className="text-muted-foreground">{copy.handoffPackageDeal}</dt>
                <dd className="font-medium text-foreground">{formatInr(dealValueCents)}</dd>
              </>
            )}
          </dl>
          {recentSnippet && (
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.handoffPackageRecent}
              </p>
              <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs text-foreground">
                {recentSnippet}
              </p>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {copy.handoffPackageCancel}
          </Button>
          <Button type="button" disabled={pending} onClick={onConfirm}>
            {pending ? copy.handoffPackageAssigning : copy.handoffPackageConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
