import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductShowcase } from "./product-showcase";
import { ChannelIcons } from "./channel-icons";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-10 md:pt-16">
      <div className="pointer-events-none absolute inset-0 surface-lavender opacity-80" />
      <div className="pointer-events-none absolute -left-32 top-20 h-64 w-64 rounded-full bg-primary-light/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-40 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto max-w-[1120px] px-6">
        <div className="mx-auto max-w-[720px] text-center">
          <ChannelIcons />

          <h1 className="display-xl text-foreground">
            AI-powered CRM for WhatsApp sales
          </h1>

          <p className="body-lg mx-auto mt-6 max-w-[560px]">
            Sell faster on WhatsApp without the mess. One inbox, a clear pipeline, and AI that
            keeps every lead moving — so nothing slips through the cracks.
          </p>

          <div className="mt-9 flex flex-col items-center gap-4">
            <Link
              href="/register"
              className="btn-gradient inline-flex h-12 items-center gap-2 rounded-full px-8 text-[15px] font-semibold shadow-lg"
            >
              Try it free for 14 days
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/demo"
              className="text-[14px] font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              View interactive demo →
            </Link>
          </div>
        </div>

        <div className="mt-14 md:mt-16">
          <ProductShowcase />
        </div>
      </div>
    </section>
  );
}
