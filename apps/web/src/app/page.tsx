import { MarketingHeader } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { SocialProof } from "@/components/marketing/social-proof";
import { StatsBar } from "@/components/marketing/stats-bar";
import { ProblemSection } from "@/components/marketing/problem-section";
import { RevenueEngine } from "@/components/marketing/revenue-engine";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { LiveDemoSection } from "@/components/marketing/live-demo-section";
import { CompetitorComparison } from "@/components/marketing/competitor-comparison";
import { IndustryUseCases } from "@/components/marketing/industry-use-cases";
import { CaseStudy } from "@/components/marketing/case-study";
import { RoiSection } from "@/components/marketing/roi-section";
import { TrustStrip } from "@/components/marketing/trust-strip";
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
        <SocialProof />
        <StatsBar />
        <ProblemSection />
        <RevenueEngine />
        <FeatureGrid />
        <LiveDemoSection />
        <CompetitorComparison />
        <IndustryUseCases />
        <CaseStudy />
        <RoiSection />
        <TrustStrip />
        <Pricing />
        <Faq />
        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
