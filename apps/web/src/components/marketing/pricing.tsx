"use client";

import { PricingPlansGrid } from "@/components/pricing/pricing-plans-grid";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { SectionHeader } from "./section-header";
import { OUTCOME_TIERS, POSITIONING } from "@/lib/gtm-copy";
import { PRICING_FOOTNOTES } from "@/lib/pricing-plans";

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-border bg-background py-20 md:py-28">
      <div className="marketing-container max-w-[1100px]">
        <SectionHeader
          label="Pricing"
          title="Solo · Team · Operator"
          subtitle={`Outcome-based INR plans for WhatsApp sellers. ${POSITIONING.trialNote}.`}
        />
        <div className="mt-12">
          <PricingPlansGrid variant="marketing" />
        </div>
        <ul className="mt-8 space-y-2 text-[12px] leading-relaxed text-muted-foreground">
          {PRICING_FOOTNOTES.map((note) => (
            <li key={note}>· {note}</li>
          ))}
        </ul>
        <div className="mt-12">
          <RoiCalculator />
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Running client WhatsApp for others?{" "}
          <a href="/agencies" className="font-semibold text-accent hover:underline">
            See Operator for agencies →
          </a>{" "}
          ({OUTCOME_TIERS.operator.name} · ₹{OUTCOME_TIERS.operator.priceInr.toLocaleString("en-IN")}/mo)
        </p>
      </div>
    </section>
  );
}
