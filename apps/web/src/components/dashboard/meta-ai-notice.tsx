import { Info } from "lucide-react";

import { useConversationsCopy } from "@/lib/i18n/conversations-copy";

/** Contextual note where humans might reply — not for global dashboards. */
export function MetaAiNotice({ compact = false }: { compact?: boolean }) {
  const copy = useConversationsCopy();
  if (!compact) return null;

  return (
    <p className="rounded-lg border border-border/60 bg-white/80 px-3 py-2 text-xs text-muted-foreground">
      <Info className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px text-primary" />
      {copy.composeFooter}
    </p>
  );
}
