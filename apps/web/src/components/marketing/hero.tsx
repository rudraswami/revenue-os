import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductPreview } from "./product-preview";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 dot-bg opacity-60" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="default" className="mb-6 px-4 py-1 text-xs">
            WhatsApp-first CRM · Loved by growing teams
          </Badge>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            AI-powered CRM for{" "}
            <span className="text-gradient">WhatsApp sales</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Sell faster on WhatsApp without the mess. One inbox, a clear pipeline, and smart
            replies — so every lead keeps moving and nothing slips through.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/register">
                Try it free for 14 days <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">View demo workspace</Link>
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required · Setup in minutes
          </p>
        </div>

        <div className="mt-16 md:mt-20">
          <ProductPreview />
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground/70">Trusted by WhatsApp-first businesses</span>
          {["Retail", "Real estate", "Education", "Healthcare", "Agencies"].map((name) => (
            <span key={name} className="font-semibold text-foreground/40">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
