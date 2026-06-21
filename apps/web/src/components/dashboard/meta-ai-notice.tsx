import { Info } from "lucide-react";

/** Contextual note where humans might reply — not for global dashboards. */
export function MetaAiNotice({ compact = false }: { compact?: boolean }) {
  if (!compact) return null;

  return (
    <p className="rounded-lg border border-border/60 bg-white/80 px-3 py-2 text-xs text-muted-foreground">
      <Info className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px text-primary" />
      Customer replies are sent in WhatsApp. Use this only for human takeover when needed.
    </p>
  );
}
