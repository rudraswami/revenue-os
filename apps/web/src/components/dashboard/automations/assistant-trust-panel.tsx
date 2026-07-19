import { ShieldCheck } from "lucide-react";

const WILL = [
  "Classify intent & update Pipeline",
  "Draft replies from your Business Knowledge",
  "Alert you when it's your turn",
  "Send auto-replies on WhatsApp only when you enable it",
];

const WONT = [
  "Invent pricing or discounts",
  "Handle complaints alone",
  "Negotiate deals or payment terms",
  "Replace your team on complex chats",
];

export function AssistantTrustPanel() {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bento-mint text-accent">
          <ShieldCheck className="h-4 w-4" aria-hidden />
        </div>
        <p className="text-sm font-semibold text-foreground">What Growvisi will and won&apos;t do</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-accent">Growvisi will</p>
          <ul className="space-y-1.5">
            {WILL.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-foreground/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-amber-800">Growvisi never</p>
          <ul className="space-y-1.5">
            {WONT.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-foreground/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
        Tap <span className="font-semibold text-foreground">I&apos;ll handle this</span> in any
        conversation to take over instantly — your customer always sees a human when it matters.
      </p>
    </div>
  );
}
