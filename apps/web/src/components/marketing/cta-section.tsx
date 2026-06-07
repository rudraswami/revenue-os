import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="rounded-3xl bg-primary px-8 py-16 text-center md:px-16 md:py-20">
          <h2 className="display-lg text-white">
            Start closing more sales with smarter automation
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-[15px] leading-relaxed text-white/80">
            Try GrowthSync for free or explore the demo workspace to see how WhatsApp sales
            can run without the mess.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90"
              asChild
            >
              <Link href="/register">Try it free for 14 days</Link>
            </Button>
            <Link
              href="/login"
              className="text-[15px] font-semibold text-white/90 transition-colors hover:text-white"
            >
              Get a demo →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
