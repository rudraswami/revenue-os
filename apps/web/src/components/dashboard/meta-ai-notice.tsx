import { Info } from "lucide-react";

/** Explains Growvisi vs Meta Business Agent — Meta policy–aligned positioning. */
export function MetaAiNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "rounded-lg border border-blue-200/60 bg-blue-50/50 px-3 py-2 text-xs text-blue-950"
          : "rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 to-primary-soft/30 px-4 py-3 text-sm text-blue-950 shadow-sm"
      }
    >
      <p className={compact ? "" : "flex items-start gap-2"}>
        {!compact && <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />}
        <span>
          <strong className={compact ? "text-blue-950" : "text-blue-950"}>
            Meta Business Agent replies in WhatsApp.
          </strong>{" "}
          Growvisi analyzes customer messages, scores leads, and tracks pipeline outcomes — we do
          not replace Meta&apos;s in-chat AI.
        </span>
      </p>
    </div>
  );
}
