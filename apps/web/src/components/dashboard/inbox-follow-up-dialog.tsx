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
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import type { FollowUpPreset } from "@/lib/inbox-follow-up-task";
import { cn } from "@/lib/utils";

export function InboxFollowUpDialog({
  open,
  onOpenChange,
  contactLabel,
  excerpt,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactLabel: string;
  excerpt?: string | null;
  pending?: boolean;
  onConfirm: (preset: FollowUpPreset) => void;
}) {
  const copy = useConversationsCopy();
  const presets: Array<{ id: FollowUpPreset; label: string }> = [
    { id: "tomorrow", label: copy.followUpTomorrow },
    { id: "three_days", label: copy.followUpThreeDays },
    { id: "next_monday", label: copy.followUpMonday },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{copy.followUpTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground">{copy.followUpHint(contactLabel)}</p>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {excerpt && (
            <p className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground line-clamp-3">
              {excerpt}
            </p>
          )}
          <div className="grid gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={pending}
                className={cn(
                  "rounded-xl border border-border/70 px-3 py-2.5 text-left text-sm font-medium transition hover:border-accent/30 hover:bg-accent/5",
                  pending && "opacity-60",
                )}
                onClick={() => onConfirm(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {copy.handoffPackageCancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
