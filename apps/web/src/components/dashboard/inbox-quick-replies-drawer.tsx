"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConversationsCopy } from "@/lib/i18n/conversations-copy";

export function InboxQuickRepliesDrawer({
  open,
  onOpenChange,
  templates,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Array<{ id: string; title: string; body: string }>;
  onSelect: (body: string) => void;
}) {
  const copy = useConversationsCopy();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q),
    );
  }, [query, templates]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="right" size="md" className="gap-0 p-0">
        <DialogHeader className="border-b border-border/80 px-4 py-4">
          <DialogTitle className="text-base">{copy.quickRepliesTitle}</DialogTitle>
          <p className="text-xs text-muted-foreground">{copy.quickRepliesHint}</p>
        </DialogHeader>

        <div className="border-b border-border/60 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.quickRepliesSearch}
              className="h-10 w-full rounded-xl border border-border/70 bg-background pl-9 pr-3 text-sm outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
            />
          </div>
        </div>

        <ul className="max-h-[min(60vh,28rem)] overflow-y-auto px-2 py-2 custom-scrollbar">
          {filtered.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              {copy.quickRepliesEmpty}
            </li>
          ) : (
            filtered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted/80"
                  onClick={() => {
                    onSelect(t.body);
                    onOpenChange(false);
                    setQuery("");
                  }}
                >
                  <span className="text-sm font-semibold text-foreground">{t.title}</span>
                  <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {t.body}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
