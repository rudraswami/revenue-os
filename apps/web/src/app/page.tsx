import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { ProblemSection } from "@/components/marketing/problem-section";
import { RevenueEngine } from "@/components/marketing/revenue-engine";
import { IndustryUseCases } from "@/components/marketing/industry-use-cases";
import { CaseStudy } from "@/components/marketing/case-study";
import { Pricing } from "@/components/marketing/pricing";
import { MetaVsGrowvisi } from "@/components/marketing/meta-vs-growvisi";
import { CompetitorComparison } from "@/components/marketing/competitor-comparison";
import { ProductStory } from "@/components/marketing/product-story";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { Faq } from "@/components/marketing/faq";
import { CtaSection } from "@/components/marketing/cta-section";
import { MarketingPageChrome } from "@/components/marketing/marketing-page-chrome";
import { POSITIONING } from "@/lib/gtm-copy";

export const metadata: Metadata = {
  title: "Growvisi — Always know whose turn it is on WhatsApp",
  description: `${POSITIONING.headline} AI classifies every lead. YOUR TURN when a human should reply. Pipeline ₹ tracked. ${POSITIONING.trialNote}.`,
  openGraph: {
    title: "Growvisi — WhatsApp revenue layer for Indian sales teams",
    description: POSITIONING.subhead,
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <Hero />
        <ProblemSection />
        <RevenueEngine />
        <IndustryUseCases />
        <CaseStudy />
        <Pricing />
        <MetaVsGrowvisi />
        <CompetitorComparison />
        <ProductStory />
        <TrustStrip />
        <Faq />
        <CtaSection />
      </main>
      <MarketingFooter />
      <MarketingPageChrome stickyCta />
    </div>
  );
}
