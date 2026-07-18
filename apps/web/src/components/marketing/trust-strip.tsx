import { HOME_TRUST } from "@/lib/brand-copy";

export function TrustStrip() {
  return (
    <section id="trust" className="border-t border-border bg-[#f8f9ff] py-8" aria-label="Trust and compliance">
      <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 text-center lg:px-8">
        {HOME_TRUST.items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
