"use client";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex shrink-0 items-center gap-1">
        {keys.map((key, i) => (
          <span key={`${key}-${i}`} className="flex items-center gap-1">
            {i > 0 && <span className="text-xs text-muted-foreground">+</span>}
            <kbd className="rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
              {key}
            </kbd>
          </span>
        ))}
      </div>
    </div>
  );
}

export function InboxKeyboardShortcuts({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const copy = useConversationsCopy();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="gap-0">
        <DialogHeader>
          <DialogTitle>{copy.keyboardShortcutsTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground">{copy.keyboardShortcutsHint}</p>
        </DialogHeader>
        <DialogBody className="divide-y divide-border/60 pt-2">
          <ShortcutRow keys={["⌘", "K"]} label={copy.keyboardShortcutCommandPalette} />
          <ShortcutRow keys={["j"]} label={copy.keyboardShortcutNext} />
          <ShortcutRow keys={["k"]} label={copy.keyboardShortcutPrev} />
          <ShortcutRow keys={["↑"]} label={copy.keyboardShortcutPrev} />
          <ShortcutRow keys={["↓"]} label={copy.keyboardShortcutNext} />
          <ShortcutRow keys={["Enter"]} label={copy.keyboardShortcutOpen} />
          <ShortcutRow keys={["Esc"]} label={copy.keyboardShortcutBack} />
          <ShortcutRow keys={["?"]} label={copy.keyboardShortcutHelp} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
