import { MarketingHeader } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { BentoFeatures } from "@/components/marketing/bento-features";
import { AiSection } from "@/components/marketing/ai-section";
import { Testimonials } from "@/components/marketing/testimonials";
import { Pricing } from "@/components/marketing/pricing";
import { CtaSection } from "@/components/marketing/cta-section";
import { MarketingFooter } from "@/components/marketing/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <Hero />
        <BentoFeatures />
        <AiSection />
        <Testimonials />
        <Pricing />
        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
