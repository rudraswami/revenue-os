"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Inbox, MessageSquarePlus, Search } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useConversationsCopy,
  type InboxListFilter,
  type InboxListScope,
} from "@/lib/i18n/conversations-copy";
import type { InboxConversationRow } from "@/components/dashboard/inbox-conversation-list";

type FilterAction = {
  id: string;
  label: string;
  hint?: string;
  active?: boolean;
  onSelect: () => void;
};

type PaletteItem =
  | { kind: "new" }
  | { kind: "filter"; action: FilterAction }
  | { kind: "conversation"; conversation: InboxConversationRow };

export function InboxCommandPalette({
  open,
  onOpenChange,
  conversations,
  selectedId,
  listFilter,
  listScope,
  queueCounts,
  onSelectConversation,
  onSetFilter,
  onSetScope,
  onNewMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: InboxConversationRow[];
  selectedId: string | null;
  listFilter: InboxListFilter;
  listScope: InboxListScope;
  queueCounts?: {
    yourTurn: number;
    mine: number;
    unassigned: number;
  };
  onSelectConversation: (id: string) => void;
  onSetFilter: (filter: InboxListFilter) => void;
  onSetScope: (scope: InboxListScope) => void;
  onNewMessage?: () => void;
}) {
  const copy = useConversationsCopy();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const filterActions: FilterAction[] = useMemo(
    () => [
      {
        id: "filter-handoff",
        label: copy.yourTurn,
        hint: queueCounts?.yourTurn ? String(queueCounts.yourTurn) : undefined,
        active: listFilter === "handoff" && listScope === "active",
        onSelect: () => {
          onSetScope("active");
          onSetFilter("handoff");
          onOpenChange(false);
        },
      },
      {
        id: "filter-mine",
        label: copy.filterMine,
        hint: queueCounts?.mine ? String(queueCounts.mine) : undefined,
        active: listFilter === "mine",
        onSelect: () => {
          onSetScope("active");
          onSetFilter("mine");
          onOpenChange(false);
        },
      },
      {
        id: "filter-unassigned",
        label: copy.filterUnassigned,
        hint: queueCounts?.unassigned ? String(queueCounts.unassigned) : undefined,
        active: listFilter === "unassigned",
        onSelect: () => {
          onSetScope("active");
          onSetFilter("unassigned");
          onOpenChange(false);
        },
      },
      {
        id: "filter-unread",
        label: copy.filterUnread,
        active: listFilter === "unread",
        onSelect: () => {
          onSetScope("active");
          onSetFilter("unread");
          onOpenChange(false);
        },
      },
      {
        id: "scope-closed",
        label: copy.scopeClosed,
        active: listScope === "closed",
        onSelect: () => {
          onSetScope("closed");
          onOpenChange(false);
        },
      },
    ],
    [
      copy,
      listFilter,
      listScope,
      onOpenChange,
      onSetFilter,
      onSetScope,
      queueCounts,
    ],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations.slice(0, 12);
    return conversations
      .filter((c) => {
        const name = (c.contactName ?? "").toLowerCase();
        const phone = c.contactPhone.toLowerCase();
        const preview = c.messages[0]?.content?.toLowerCase() ?? "";
        return name.includes(q) || phone.includes(q) || preview.includes(q);
      })
      .slice(0, 12);
  }, [conversations, query]);

  const items = useMemo(() => {
    const list: PaletteItem[] = [];
    if (onNewMessage) list.push({ kind: "new" });
    if (!query.trim()) {
      for (const action of filterActions) {
        list.push({ kind: "filter", action });
      }
    }
    for (const conversation of filtered) {
      list.push({ kind: "conversation", conversation });
    }
    return list;
  }, [filtered, filterActions, onNewMessage, query]);

  const pickConversation = useCallback(
    (id: string) => {
      onSelectConversation(id);
      onOpenChange(false);
    },
    [onOpenChange, onSelectConversation],
  );

  const runActiveItem = useCallback(() => {
    const item = items[activeIndex];
    if (!item) return;
    if (item.kind === "new") {
      onNewMessage?.();
      onOpenChange(false);
      return;
    }
    if (item.kind === "filter") {
      item.action.onSelect();
      return;
    }
    pickConversation(item.conversation.id);
  }, [activeIndex, items, onNewMessage, onOpenChange, pickConversation]);

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(items.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter" && items.length > 0) {
      e.preventDefault();
      runActiveItem();
    }
  }

  let itemIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="gap-0 p-0" showClose={false}>
        <DialogHeader className="border-0 px-4 pb-2 pt-4">
          <DialogTitle className="sr-only">{copy.commandPaletteTitle}</DialogTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={copy.commandPalettePlaceholder}
              className="h-10 rounded-xl border-border/80 bg-background pl-10 pr-4"
            />
          </div>
          <p className="text-xs text-muted-foreground">{copy.commandPaletteHint}</p>
        </DialogHeader>
        <DialogBody className="max-h-[min(60vh,420px)] px-2 pb-3 pt-0">
          {onNewMessage && (
            (() => {
              itemIndex += 1;
              const idx = itemIndex;
              return (
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted/80",
                    activeIndex === idx && "bg-accent/10 ring-1 ring-accent/20",
                  )}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    onNewMessage();
                    onOpenChange(false);
                  }}
                >
                  <MessageSquarePlus className="h-4 w-4 text-accent" />
                  <span className="font-medium">{copy.newMessage}</span>
                </button>
              );
            })()
          )}

          {!query.trim() && (
            <div className="mb-2 px-1">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.commandPaletteQueues}
              </p>
              <div className="grid gap-0.5">
                {filterActions.map((action) => {
                  itemIndex += 1;
                  const idx = itemIndex;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted/80",
                        action.active && "text-accent",
                        activeIndex === idx && "bg-accent/10 ring-1 ring-accent/20",
                      )}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={action.onSelect}
                    >
                      <span>{action.label}</span>
                      {action.hint ? (
                        <span className="text-xs text-muted-foreground">{action.hint}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="px-1">
            <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {query.trim() ? copy.commandPaletteMatches : copy.commandPaletteRecent}
            </p>
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {copy.commandPaletteNoMatches}
              </p>
            ) : (
              <ul className="grid gap-0.5">
                {filtered.map((c) => {
                  itemIndex += 1;
                  const idx = itemIndex;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted/80",
                          selectedId === c.id && "text-accent",
                          activeIndex === idx && "bg-accent/10 ring-1 ring-accent/20",
                        )}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => pickConversation(c.id)}
                      >
                        <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {c.contactName ?? c.contactPhone}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {c.messages[0]?.content ?? c.contactPhone}
                          </p>
                        </div>
                        {c.unreadCount > 0 && (
                          <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs font-bold text-white">
                            {c.unreadCount}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
