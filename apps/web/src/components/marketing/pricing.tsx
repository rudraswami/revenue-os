"use client";

import { RoiCalculator } from "@/components/marketing/roi-calculator";
import { PricingPreview } from "@/components/marketing/pricing-preview";
import { SectionHeader } from "./section-header";
import { HOME_LEAKAGE, HOME_PRICING } from "@/lib/brand-copy";

/** Homepage pricing — leakage math first, then two-tier preview */
export function Pricing() {
  return (
    <>
      <section
        id="revenue-impact"
        className="scroll-mt-20 border-t border-border bg-background py-20 md:py-28"
      >
        <div className="marketing-container max-w-[1100px]">
          <SectionHeader
            label={HOME_LEAKAGE.label}
            title={HOME_LEAKAGE.title}
            subtitle={HOME_LEAKAGE.subtitle}
          />
          <div className="mt-12">
            <RoiCalculator />
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-20 border-t border-border bg-[#fafbff] py-20 md:py-28">
        <div className="marketing-container max-w-[1100px]">
          <SectionHeader
            label={HOME_PRICING.label}
            title={HOME_PRICING.title}
            subtitle={HOME_PRICING.subtitle}
          />
          <div className="mt-12">
            <PricingPreview />
          </div>
        </div>
      </section>
    </>
  );
}
