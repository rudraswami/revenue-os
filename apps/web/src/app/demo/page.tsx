import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { BentoFeatures } from "@/components/marketing/bento-features";
import { MarketingFooter } from "@/components/marketing/footer";
import { ChannelIcons } from "@/components/marketing/channel-icons";

export const metadata = {
  title: "Demo — Growvisi",
  description: "Explore the Growvisi WhatsApp CRM in an interactive demo.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <section className="relative overflow-hidden pt-10 md:pt-16">
          <div className="pointer-events-none absolute inset-0 surface-lavender opacity-80" />
          <div className="relative mx-auto max-w-[1120px] px-6 pb-20">
            <div className="mx-auto max-w-[720px] text-center">
              <p className="section-label">Interactive demo</p>
              <ChannelIcons />
              <h1 className="display-xl mt-2 text-foreground">
                See Growvisi in action
              </h1>
              <p className="body-lg mx-auto mt-6 max-w-[560px]">
                Explore a live preview of Inbox, Pipeline, and Dashboard. No signup required —
                create a free workspace when you&apos;re ready.
              </p>
              <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/register"
                  className="btn-gradient inline-flex h-12 items-center gap-2 rounded-full px-8 text-[15px] font-semibold shadow-lg"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="text-[14px] font-medium text-primary hover:underline"
                >
                  Log in to your workspace
                </Link>
              </div>
            </div>
            <div className="mt-14">
              <ProductShowcase />
            </div>
            <p className="mt-8 text-center text-[13px] text-muted-foreground">
              This is a simulated preview. Connect your real WhatsApp number after signing up.
            </p>
          </div>
        </section>
        <BentoFeatures />
        <section className="py-16 surface-lavender">
          <div className="mx-auto max-w-[560px] px-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Ready to use it with your customers?</h2>
            <p className="mt-3 text-muted-foreground">
              Set up takes about 15 minutes. Try free for 14 days.
            </p>
            <Link
              href="/register"
              className="btn-gradient mt-8 inline-flex h-12 items-center gap-2 rounded-full px-8 text-[15px] font-semibold shadow-lg"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
