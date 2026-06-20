import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const before = [
  "Leads scattered on personal phones",
  "No shared pipeline",
  "Follow-ups missed daily",
  "No way to prioritize hot buyers",
];

const after = [
  "Shared team inbox on one number",
  "AI qualification on every thread",
  "Pipeline visibility for the whole team",
  "Hot leads surfaced automatically",
];

const results = [
  { value: "+35%", label: "Faster Response" },
  { value: "+22%", label: "Higher Conversion" },
  { value: "+40%", label: "Team Productivity" },
];

export function CaseStudy() {
  return (
    <section className="surface-lavender py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <ScrollReveal className="mx-auto max-w-[640px] text-center">
          <p className="section-label">Customer story</p>
          <h2 className="display-lg mt-3 text-foreground">
            From scattered chats to a revenue system
          </h2>
          <p className="body-lg mx-auto mt-4 max-w-[520px]">
            How a growing sales team turned WhatsApp into their highest-converting channel.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <ScrollReveal>
            <div className="h-full rounded-2xl border border-border bg-white p-8 shadow-sm">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                Before Growvisi
              </p>
              <ul className="mt-6 space-y-3">
                {before.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <div className="h-full rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/50 to-white p-8 shadow-sm">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-primary">
                After Growvisi
              </p>
              <ul className="mt-6 space-y-3">
                {after.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] font-medium text-foreground">
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.12} className="mt-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {results.map((r) => (
              <div
                key={r.label}
                className="card-lift rounded-2xl border border-border bg-gradient-to-b from-white to-primary-soft/20 px-6 py-8 text-center shadow-sm"
              >
                <p className="text-4xl font-bold tracking-tight text-primary">{r.value}</p>
                <p className="mt-2 text-[14px] font-medium text-muted-foreground">{r.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[12px] text-muted-foreground">
            Representative outcomes from early pilot teams. Your results will vary.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
