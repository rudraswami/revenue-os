import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductShowcase } from "./product-showcase";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 md:pt-20">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="mx-auto max-w-[720px] text-center">
          <h1 className="display-xl text-foreground">
            AI-powered CRM for WhatsApp sales
          </h1>

          <p className="body-lg mx-auto mt-6 max-w-[560px]">
            Sell faster on WhatsApp without the mess. One inbox, a clear pipeline, and AI that
            keeps every lead moving — so nothing slips through the cracks.
          </p>

          <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/register">Try it free for 14 days</Link>
            </Button>
            <Link
              href="/login"
              className="text-[15px] font-medium text-primary transition-colors hover:text-[var(--color-primary-hover)]"
            >
              View demo workspace →
            </Link>
          </div>
        </div>

        <div className="mt-14 md:mt-20">
          <ProductShowcase />
        </div>

        <p className="mt-12 text-center text-[13px] font-medium text-muted-foreground">
          Loved by small businesses &amp; entrepreneurs in 40+ countries
        </p>
      </div>
    </section>
  );
}
