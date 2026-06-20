import { ScrollReveal } from "./scroll-reveal";

const before = [
  "Leads scattered on personal phones",
  "No shared pipeline",
  "Follow-ups missed daily",
];

const after = [
  "Shared team inbox on one number",
  "AI qualification on every thread",
  "Pipeline visibility for the whole team",
];

const stats = [
  { value: "35%", label: "Faster Response" },
  { value: "22%", label: "Higher Conversion" },
  { value: "90%", label: "Fewer Missed Follow-Ups" },
  { value: "40%", label: "More Productivity" },
];

export function CaseStudy() {
  return (
    <section id="case-study" className="scroll-mt-20 border-b border-border bg-white py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal className="text-center">
          <h2 className="display-lg text-foreground">GreenSpace Properties</h2>
          <p className="body-lg mx-auto mt-3 max-w-[520px]">
            How a real estate team turned WhatsApp enquiries into a predictable revenue pipeline.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <ScrollReveal>
            <div className="elev-1 h-full rounded-2xl bg-white p-8">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                Before Growvisi
              </p>
              <ul className="mt-6 space-y-3">
                {before.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[14px] text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <div className="elev-1 h-full rounded-2xl border border-accent/20 bg-[#ecfdf5]/30 p-8">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-accent">
                After Growvisi
              </p>
              <ul className="mt-6 space-y-3">
                {after.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[14px] font-medium">
                    <span className="mt-0.5 text-accent">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <ScrollReveal key={s.label} delay={i * 0.05}>
              <div className="elev-1 rounded-2xl bg-white p-6 text-center">
                <p className="text-3xl font-bold text-accent">{s.value}</p>
                <p className="mt-2 text-[14px] font-medium text-muted-foreground">{s.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <p className="mt-6 text-center text-[12px] text-muted-foreground">
          Representative outcomes from early pilot teams.
        </p>
      </div>
    </section>
  );
}
