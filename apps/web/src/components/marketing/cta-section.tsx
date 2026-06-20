import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="bg-[#0b1c30] py-20 md:py-24">
      <div className="mx-auto max-w-[720px] px-6 text-center">
        <h2 className="display-lg text-white">
          Ready To Turn WhatsApp Into Your Best Sales Channel?
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-white/70">
          Start your free trial or book a demo with our team.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="btn-primary inline-flex items-center gap-2 rounded-lg px-8 py-3 text-[15px]"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-lg border border-white/25 px-8 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
          >
            Book Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
