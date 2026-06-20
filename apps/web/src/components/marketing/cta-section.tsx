import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[#1a1a2e] px-8 py-16 text-center shadow-2xl md:px-16 md:py-20">
          <div className="pointer-events-none absolute -left-20 top-0 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-40 w-40 rounded-full bg-[#25D366]/20 blur-3xl" />
          <div className="relative">
            <h2 className="display-lg text-white">
              Ready To Turn WhatsApp Into Your Best Sales Channel?
            </h2>
            <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-relaxed text-white/70">
              Start your free trial or book a demo — see how Growvisi turns every conversation into
              pipeline and revenue.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#f5c842] px-8 text-[15px] font-bold text-[#1a1a2e] transition-transform hover:scale-[1.02]"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center rounded-full border border-white/30 px-8 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
              >
                Book Demo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
