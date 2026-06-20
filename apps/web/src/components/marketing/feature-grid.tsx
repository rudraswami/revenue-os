"use client";

import { ScrollReveal } from "./scroll-reveal";
import {
  AnalyticsMock,
  AutomationsMock,
  InboxMock,
  IntelligenceMock,
  PipelineMock,
} from "./mocks/product-mocks";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const features = [
  {
    title: "Conversation Intelligence",
    description:
      "AI reads every WhatsApp thread — intent, sentiment, and stage — so your team never guesses.",
    theme: "feature-card-purple",
    Mock: InboxMock,
    href: "/demo",
  },
  {
    title: "AI Lead Scoring",
    description:
      "Know which leads deserve immediate attention. Hot buyers surface automatically with scores.",
    theme: "feature-card-orange",
    Mock: IntelligenceMock,
    href: "/demo",
  },
  {
    title: "Sales Pipeline",
    description:
      "Drag deals through a clear process. AI auto-updates stages when intent changes.",
    theme: "feature-card-blue",
    Mock: PipelineMock,
    href: "/demo",
  },
  {
    title: "Revenue Analytics",
    description:
      "Track conversion funnels, team performance, and pipeline value in real time.",
    theme: "feature-card-green",
    Mock: AnalyticsMock,
    href: "/demo",
  },
];

export function FeatureGrid() {
  return (
    <section id="product" className="scroll-mt-20 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <ScrollReveal className="mx-auto max-w-[640px] text-center">
          <p className="section-label">Advanced features</p>
          <h2 className="display-lg mt-3 text-foreground">
            Everything you need to close on WhatsApp
          </h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {features.map((feature, i) => {
            const Mock = feature.Mock;
            return (
              <ScrollReveal key={feature.title} delay={i * 0.06}>
                <div
                  className={`card-lift group overflow-hidden rounded-3xl border border-border/60 ${feature.theme}`}
                >
                  <div className="p-8 pb-4">
                    <h3 className="text-xl font-bold tracking-tight">{feature.title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                    <Link
                      href={feature.href}
                      className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Explore <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="px-4 pb-4 pt-2">
                    <div className="overflow-hidden rounded-2xl border border-white/80 shadow-lg transition-transform duration-500 group-hover:scale-[1.02]">
                      <Mock compact />
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal delay={0.2} className="mt-8">
          <div className="card-lift overflow-hidden rounded-3xl border border-border feature-card-green">
            <div className="grid items-center gap-6 p-8 lg:grid-cols-2">
              <div>
                <h3 className="text-xl font-bold">Workflow Automations</h3>
                <p className="mt-2 text-[14px] text-muted-foreground">
                  Follow-up reminders, hot lead alerts, and auto stage updates — never miss another
                  opportunity.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/80 shadow-lg">
                <AutomationsMock compact />
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
