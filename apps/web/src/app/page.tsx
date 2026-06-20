import { MarketingHeader } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { ProblemSection } from "@/components/marketing/problem-section";
import { RevenueEngine } from "@/components/marketing/revenue-engine";
import { FeatureShowcase } from "@/components/marketing/feature-showcase";
import { CompetitorComparison } from "@/components/marketing/competitor-comparison";
import { IndustryUseCases } from "@/components/marketing/industry-use-cases";
import { CaseStudy } from "@/components/marketing/case-study";
import { Pricing } from "@/components/marketing/pricing";
import { Faq } from "@/components/marketing/faq";
import { CtaSection } from "@/components/marketing/cta-section";
import { MarketingFooter } from "@/components/marketing/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <Hero />
        <ProblemSection />
        <RevenueEngine />
        <FeatureShowcase />
        <CompetitorComparison />
        <IndustryUseCases />
        <CaseStudy />
        <Pricing />
        <Faq />
        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
