import { ScrollReveal } from "./scroll-reveal";

const funnelSteps = [
  { label: "100 Leads", sub: "WhatsApp enquiries" },
  { label: "40 Replied", sub: "Team responds" },
  { label: "15 Followed Up", sub: "Second touch" },
  { label: "5 Converted", sub: "Revenue" },
];

const painPoints = [
  "No ownership",
  "No tracking",
  "No prioritization",
  "No follow-up",
];

export function ProblemSection() {
  return (
    <section className="border-y border-border/60 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <ScrollReveal className="mx-auto max-w-[640px] text-center">
          <p className="section-label">The problem</p>
          <h2 className="display-lg mt-3 text-foreground">
            Most WhatsApp Leads Never Become Customers
          </h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:items-center">
          <ScrollReveal>
            <div className="mx-auto max-w-md">
              {funnelSteps.map((step, i) => (
                <div key={step.label} className="flex flex-col items-center">
                  <div className="flex w-full items-center gap-4">
                    <div
                      className="flex h-16 w-full flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 px-4 py-3 text-center shadow-sm"
                      style={{ opacity: 1 - i * 0.12 }}
                    >
                      <p className="text-lg font-bold text-foreground">{step.label}</p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{step.sub}</p>
                    </div>
                  </div>
                  {i < funnelSteps.length - 1 && (
                    <div className="my-2 flex h-8 flex-col items-center text-muted-foreground">
                      <span className="h-full w-px bg-border" />
                      <span className="text-lg leading-none">↓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-amber-900/80">
                Why?
              </p>
              <ul className="mt-6 space-y-4">
                {painPoints.map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-3 text-[16px] font-medium text-foreground"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 shadow-sm ring-1 ring-amber-200/80">
                      ×
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-[14px] leading-relaxed text-muted-foreground">
                WhatsApp is where your buyers are — but without a revenue system, conversations stay
                scattered across phones and spreadsheets.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
