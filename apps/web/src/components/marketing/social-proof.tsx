"use client";

import { ScrollReveal } from "./scroll-reveal";

const industries = [
  "Real Estate",
  "Education",
  "Healthcare",
  "D2C Brands",
  "Automotive",
  "Interior Design",
  "Consulting",
  "SaaS Sales",
];

function LogoPill({ name }: { name: string }) {
  return (
    <div className="mx-6 flex shrink-0 items-center justify-center rounded-xl border border-border/60 bg-white px-8 py-4 shadow-sm">
      <span className="whitespace-nowrap text-[15px] font-semibold text-muted-foreground">{name}</span>
    </div>
  );
}

export function SocialProof() {
  return (
    <section className="overflow-hidden border-b border-border/60 bg-white py-14">
      <ScrollReveal className="mx-auto max-w-[1120px] px-6 text-center">
        <p className="text-lg font-bold text-foreground">Teams that sell on WhatsApp trust Growvisi</p>
        <p className="mt-2 text-[14px] text-muted-foreground">
          Built for Indian sales teams — real estate, education, clinics, D2C &amp; more
        </p>
      </ScrollReveal>

      <div className="relative mt-10 flex overflow-hidden">
        <div className="animate-marquee flex">
          {[...industries, ...industries].map((name, i) => (
            <LogoPill key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </section>
  );
}
