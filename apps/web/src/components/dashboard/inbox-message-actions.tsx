"use client";

import { Copy, MoreHorizontal, Pin, Reply } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import { cn } from "@/lib/utils";

export function InboxMessageActions({
  canQuote,
  canCopy,
  canPin,
  onQuote,
  onCopy,
  onPin,
  className,
}: {
  canQuote: boolean;
  canCopy: boolean;
  canPin?: boolean;
  onQuote?: () => void;
  onCopy?: () => void;
  onPin?: () => void;
  className?: string;
}) {
  const copy = useConversationsCopy();

  if (!canQuote && !canCopy && !canPin) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card text-muted-foreground opacity-0 shadow-sm transition hover:text-accent group-hover:opacity-100 data-[state=open]:opacity-100",
            className,
          )}
          aria-label={copy.messageActions}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {canQuote && onQuote && (
          <DropdownMenuItem onClick={onQuote}>
            <Reply className="mr-2 h-3.5 w-3.5" />
            {copy.quoteReply}
          </DropdownMenuItem>
        )}
        {canCopy && onCopy && (
          <DropdownMenuItem onClick={onCopy}>
            <Copy className="mr-2 h-3.5 w-3.5" />
            {copy.copyMessage}
          </DropdownMenuItem>
        )}
        {canPin && onPin && (
          <DropdownMenuItem onClick={onPin}>
            <Pin className="mr-2 h-3.5 w-3.5" />
            {copy.pinToNote}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
