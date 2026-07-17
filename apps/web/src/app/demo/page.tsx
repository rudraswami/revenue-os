import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTA } from "@/lib/brand-copy";
import { MarketingHeader } from "@/components/marketing/header";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata = {
  title: "Demo — Growvisi",
  description: "Explore the Growvisi AI Revenue Engine — inbox, pipeline, lead scoring, and analytics.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <section className="border-b border-border bg-white py-16 md:py-24">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
            <div className="mx-auto max-w-[640px] text-center">
              <h1 className="display-lg text-foreground">Explore the product</h1>
              <p className="body-lg mt-4">
                Interactive preview of Conversations, Intelligence, Pipeline, and Analytics. Connect your
                real WhatsApp number after signing up.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Button asChild>
                  <Link href="/register">
                    {CTA.startTrial} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/contact">{CTA.bookDemo}</Link>
                </Button>
              </div>
            </div>
            <div className="mt-14 elev-interactive overflow-hidden rounded-2xl bg-card p-4 md:p-6">
              <ProductShowcase />
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
