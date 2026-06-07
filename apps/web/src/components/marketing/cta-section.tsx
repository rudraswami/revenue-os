import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground md:px-16">
          <div className="pointer-events-none absolute inset-0 dot-bg opacity-20" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Start closing more sales with smarter automation
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Try GrowthSync for free or explore the demo workspace to see how WhatsApp sales
              can run without the mess.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                variant="secondary"
                className="bg-white text-primary hover:bg-white/90"
                asChild
              >
                <Link href="/register">
                  Try it free for 14 days <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
                asChild
              >
                <Link href="/login">View demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
