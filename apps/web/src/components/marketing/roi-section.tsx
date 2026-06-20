import { ScrollReveal } from "./scroll-reveal";

const metrics = [
  { value: "35%", label: "Faster Response", detail: "Reply while intent is still hot" },
  { value: "22%", label: "Higher Conversion", detail: "Prioritize buyers, not browsers" },
  { value: "90%", label: "Fewer Missed Follow-Ups", detail: "Systematic pipeline discipline" },
  { value: "40%", label: "More Team Productivity", detail: "One inbox, clear ownership" },
];

export function RoiSection() {
  return (
    <section id="roi" className="scroll-mt-20 border-y border-border/60 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <ScrollReveal className="mx-auto max-w-[640px] text-center">
          <p className="section-label">ROI</p>
          <h2 className="display-lg mt-3 text-foreground">Results That Matter</h2>
          <p className="body-lg mx-auto mt-4 max-w-[520px]">
            Growvisi pays for itself when your team stops losing deals in WhatsApp threads.
          </p>
        </ScrollReveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m, i) => (
            <ScrollReveal key={m.label} delay={i * 0.05}>
              <div className="rounded-2xl border border-border bg-gradient-to-b from-white to-muted/30 p-6 text-center shadow-sm">
                <p className="text-4xl font-bold tracking-tight text-foreground">{m.value}</p>
                <p className="mt-2 text-[15px] font-semibold">{m.label}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{m.detail}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
