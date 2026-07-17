"use client";

import { ScrollReveal } from "./scroll-reveal";
import {
  AnalyticsPreview,
  IntelligencePreview,
  PipelinePreview,
  ScoringPreview,
} from "./dashboard-previews";

const features = [
  {
    title: "Conversation Intelligence",
    description: "AI understands every customer conversation — intent, sentiment, and next best action.",
    Preview: IntelligencePreview,
  },
  {
    title: "Lead Scoring",
    description: "Know which leads deserve immediate attention with real-time AI scores.",
    Preview: ScoringPreview,
  },
  {
    title: "Pipeline",
    description: "Move deals through a clear sales process with auto stage updates.",
    Preview: PipelinePreview,
  },
  {
    title: "Analytics & Automation",
    description: "Track conversion performance, revenue, and never miss a follow-up.",
    Preview: AnalyticsPreview,
  },
];

export function FeatureShowcase() {
  return (
    <section id="product" className="scroll-mt-20 bg-[#f8f9ff] py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal className="text-center">
          <h2 className="display-lg text-foreground">Everything You Need To Close On WhatsApp</h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {features.map((f, i) => {
            const Preview = f.Preview;
            return (
              <ScrollReveal key={f.title} delay={i * 0.06}>
                <article className="elev-interactive overflow-hidden rounded-2xl bg-card">
                  <div className="border-b border-border p-6 md:p-8">
                    <h3 className="text-xl font-bold text-foreground">{f.title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                      {f.description}
                    </p>
                  </div>
                  <div className="bg-[#fafbff] p-4 md:p-6">
                    <Preview />
                  </div>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
