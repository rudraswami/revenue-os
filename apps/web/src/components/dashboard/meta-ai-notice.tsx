import { Info } from "lucide-react";

/** Explains Growvisi vs Meta Business Agent — Meta policy–aligned positioning. */
export function MetaAiNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
          : "rounded-xl border border-blue-200/80 bg-blue-50/60 px-4 py-3 text-sm text-blue-950"
      }
    >
      <p className={compact ? "" : "flex items-start gap-2"}>
        {!compact && <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />}
        <span>
          <strong className={compact ? "text-foreground" : "text-blue-950"}>
            Meta Business Agent replies in WhatsApp.
          </strong>{" "}
          Growvisi analyzes customer messages, scores leads, and tracks pipeline outcomes — we do
          not replace Meta&apos;s in-chat AI.
        </span>
      </p>
    </div>
  );
}
