"use client";

import { Search, Smile } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";
import {
  INBOX_EMOJI_CATEGORIES,
  loadRecentEmojis,
  pushRecentEmoji,
  searchInboxEmojis,
} from "@/lib/inbox-emoji";
import { cn } from "@/lib/utils";

export function InboxEmojiPicker({
  onPick,
  disabled,
  className,
}: {
  onPick: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const copy = useConversationsCopy();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<string[]>([]);

  const searchResults = useMemo(() => searchInboxEmojis(query), [query]);

  function handlePick(emoji: string) {
    onPick(emoji);
    setRecents(pushRecentEmoji(emoji));
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setRecents(loadRecentEmojis());
      setQuery("");
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50",
            className,
          )}
          disabled={disabled}
          aria-label={copy.emojiPicker}
        >
          <Smile className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="border-b border-border/60 p-2">
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.emojiSearchPlaceholder}
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
          {query ? (
            searchResults.length > 0 ? (
              <div className="grid grid-cols-6 gap-0.5">
                {searchResults.map((item) => (
                  <EmojiButton
                    key={item.char}
                    emoji={item.char}
                    onPick={handlePick}
                  />
                ))}
              </div>
            ) : (
              <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                {copy.emojiNoResults}
              </p>
            )
          ) : (
            <>
              {recents.length > 0 && (
                <EmojiGroup label={copy.emojiRecent}>
                  {recents.map((char) => (
                    <EmojiButton key={`recent-${char}`} emoji={char} onPick={handlePick} />
                  ))}
                </EmojiGroup>
              )}
              {INBOX_EMOJI_CATEGORIES.map((group) => (
                <EmojiGroup key={group.label} label={group.label}>
                  {group.items.map((item) => (
                    <EmojiButton key={item.char} emoji={item.char} onPick={handlePick} />
                  ))}
                </EmojiGroup>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function EmojiGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="grid grid-cols-6 gap-0.5">{children}</div>
    </div>
  );
}

function EmojiButton({
  emoji,
  onPick,
}: {
  emoji: string;
  onPick: (emoji: string) => void;
}) {
  return (
    <button
      type="button"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-muted"
      onClick={() => onPick(emoji)}
    >
      {emoji}
    </button>
  );
}
