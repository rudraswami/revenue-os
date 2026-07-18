import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { PricingPageContent } from "@/components/marketing/pricing-page-content";
import { POSITIONING } from "@/lib/gtm-copy";

export const metadata: Metadata = {
  title: "Pricing — Growvisi",
  description: `INR plans for WhatsApp sales teams. ${POSITIONING.trialNote}. Solo, Team, Operator, and Enterprise.`,
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <PricingPageContent />
      </main>
      <MarketingFooter />
    </div>
  );
}
