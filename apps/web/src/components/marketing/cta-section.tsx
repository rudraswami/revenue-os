import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="rounded-3xl bg-[#1a1a2e] px-8 py-16 text-center md:px-16 md:py-20">
          <h2 className="display-lg text-white">
            Start closing more sales with smarter automation
          </h2>
          <p className="mx-auto mt-4 max-w-[480px] text-[15px] leading-relaxed text-white/70">
            Try Growvisi for free or get a demo to see how WhatsApp sales can run without the mess.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#f5c842] px-8 text-[15px] font-bold text-[#1a1a2e] transition-transform hover:scale-[1.02]"
            >
              Try it free for 14 days
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center rounded-full border border-white/30 px-8 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Get a demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
