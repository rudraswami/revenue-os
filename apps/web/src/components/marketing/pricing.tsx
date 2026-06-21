"use client";

import { PricingPlansGrid } from "@/components/pricing/pricing-plans-grid";
import { SectionHeader } from "./section-header";

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-border bg-background py-20 md:py-28">
      <div className="marketing-container max-w-[1100px]">
        <SectionHeader
          label="Pricing"
          title="Transparent INR pricing"
          subtitle="14-day free trial on every plan. No credit card to start."
        />
        <div className="mt-12">
          <PricingPlansGrid variant="marketing" />
        </div>
      </div>
    </section>
  );
}
