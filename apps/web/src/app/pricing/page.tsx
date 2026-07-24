import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { PricingPageContent } from "@/components/marketing/pricing-page-content";
import { MarketingPageChrome } from "@/components/marketing/marketing-page-chrome";
import { PricingStructuredData } from "@/components/marketing/structured-data";
import { POSITIONING } from "@/lib/gtm-copy";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing — Growvisi",
  description: `INR plans for WhatsApp sales teams. ${POSITIONING.trialNote}. Solo ₹999, Team ₹2,999, Operator ₹5,999, and Enterprise.`,
  path: "/pricing",
  ogTitle: "Growvisi pricing — WhatsApp revenue OS for Indian teams",
  ogDescription: POSITIONING.trialNote,
});

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PricingStructuredData />
      <MarketingHeader />
      <main>
        <PricingPageContent />
      </main>
      <MarketingFooter />
      <MarketingPageChrome />
    </div>
  );
}
