import { MarketingHeader } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { PartnerLogos } from "@/components/marketing/partner-logos";
import { BentoFeatures } from "@/components/marketing/bento-features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { AiSection } from "@/components/marketing/ai-section";
import { Testimonials } from "@/components/marketing/testimonials";
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
        <PartnerLogos />
        <BentoFeatures />
        <HowItWorks />
        <AiSection />
        <Testimonials />
        <Pricing />
        <Faq />
        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
