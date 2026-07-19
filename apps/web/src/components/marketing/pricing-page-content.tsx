"use client";

import Link from "next/link";
import { PricingPlansGrid } from "@/components/pricing/pricing-plans-grid";
import { EnterpriseCallout } from "@/components/marketing/enterprise-callout";
import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { SectionHeader } from "@/components/marketing/section-header";
import { OUTCOME_TIERS, POSITIONING } from "@/lib/gtm-copy";
import { PRICING_FOOTNOTES } from "@/lib/pricing-plans";

export function PricingPageContent() {
  return (
    <>
      <div className="border-b border-border/60 bg-gradient-to-b from-primary-soft/30 to-transparent py-12 md:py-16">
        <div className="marketing-container max-w-[1100px]">
          <p className="section-label">Pricing</p>
          <h1 className="display-lg mt-3 max-w-[720px] text-foreground">
            Less than the cost of one lost WhatsApp lead
          </h1>
          <p className="mt-4 max-w-[640px] text-[17px] leading-relaxed text-muted-foreground">
            Transparent INR plans for WhatsApp sellers. {POSITIONING.trialNote}. Your team replies from
            Inbox by default — optional guarded auto-send for simple replies on Growth.
          </p>
        </div>
      </div>

      <div className="marketing-container max-w-[1100px] py-16 md:py-20">
        <SectionHeader
          center={false}
          label="Plans"
          title="Solo · Team · Operator · Enterprise"
          subtitle="Outcome-based tiers — pick by team size and WhatsApp volume."
        />
        <div className="mt-10">
          <PricingPlansGrid variant="marketing" />
        </div>

        <EnterpriseCallout />

        <ul className="mt-8 space-y-2 text-[12px] leading-relaxed text-muted-foreground">
          {PRICING_FOOTNOTES.map((note) => (
            <li key={note}>· {note}</li>
          ))}
        </ul>

        <div className="mt-16">
          <SectionHeader
            center={false}
            label="ROI"
            title="Model your WhatsApp leakage"
            subtitle="Use your numbers before you commit — same calculator as the homepage."
          />
          <div className="mt-10">
            <RoiCalculator />
          </div>
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Running client WhatsApp for others?{" "}
          <Link href="/agencies" className="font-semibold text-accent hover:underline">
            See Operator for agencies →
          </Link>{" "}
          ({OUTCOME_TIERS.operator.name} · ₹
          {OUTCOME_TIERS.operator.priceInr.toLocaleString("en-IN")}/mo)
        </p>
      </div>
    </>
  );
}
