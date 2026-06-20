import { Check } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const perks = [
  "Free 14-day trial",
  "No credit card required",
  "Setup in 15 minutes",
  "Official WhatsApp API",
  "Cancel anytime",
];

export function TrustStrip() {
  return (
    <section className="border-y border-border/60 bg-muted/40 py-8">
      <div className="mx-auto max-w-[1120px] px-6">
        <ScrollReveal>
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <Check className="h-4 w-4 text-[#25D366]" strokeWidth={2.5} />
                {perk}
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </div>
    </section>
  );
}
