import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { RevenueEngine } from "@/components/marketing/revenue-engine";
import { MarketingFooter } from "@/components/marketing/footer";
import { CtaSection } from "@/components/marketing/cta-section";

export const metadata = {
  title: "Demo — Growvisi",
  description:
    "Explore the Growvisi AI Revenue Engine — inbox, pipeline, lead scoring, and analytics in an interactive preview.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <section className="relative overflow-hidden pt-10 md:pt-16">
          <div className="pointer-events-none absolute inset-0 surface-lavender opacity-80" />
          <div className="relative mx-auto max-w-[1120px] px-6 pb-12">
            <div className="mx-auto max-w-[720px] text-center">
              <p className="section-label">Interactive demo</p>
              <h1 className="display-xl mt-2 text-foreground">
                See how conversations become revenue
              </h1>
              <p className="body-lg mx-auto mt-6 max-w-[560px]">
                Explore Inbox, Pipeline, and Analytics — the same views your team uses after
                connecting WhatsApp. No signup required.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <Link
                  href="/register"
                  className="btn-gradient inline-flex h-12 items-center gap-2 rounded-full px-8 text-[15px] font-semibold shadow-lg"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex h-12 items-center rounded-full border border-border bg-white px-8 text-[15px] font-semibold text-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
                >
                  Book Demo
                </Link>
              </div>
            </div>
            <div className="mt-14">
              <ProductShowcase />
            </div>
            <p className="mt-8 text-center text-[13px] text-muted-foreground">
              Simulated preview with sample data. Connect your real WhatsApp number after signing up
              — setup takes about 15 minutes.
            </p>
          </div>
        </section>

        <div className="border-t border-border/60">
          <RevenueEngine />
        </div>

        <CtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
