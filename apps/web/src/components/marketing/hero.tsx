import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const trustItems = [
  "Official WhatsApp API",
  "Setup in 15 Minutes",
  "Multi-Agent Inbox",
  "AI Lead Scoring",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-10 md:pt-16">
      <div className="pointer-events-none absolute inset-0 surface-lavender opacity-80" />
      <div className="pointer-events-none absolute -left-32 top-20 h-64 w-64 rounded-full bg-primary-light/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-40 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto max-w-[1120px] px-6 pb-20 md:pb-28">
        <ScrollReveal className="mx-auto max-w-[760px] text-center">
          <p className="section-label">The AI Revenue Engine for WhatsApp Sales Teams</p>

          <h1 className="display-xl mt-4 text-foreground">
            Turn WhatsApp Conversations Into Revenue
          </h1>

          <p className="body-lg mx-auto mt-6 max-w-[600px]">
            Growvisi automatically analyzes conversations, scores buying intent, updates your
            pipeline, triggers follow-ups, and helps your team close more deals.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/register"
              className="btn-gradient inline-flex h-12 items-center gap-2 rounded-full px-8 text-[15px] font-semibold shadow-lg"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center rounded-full border border-border bg-white px-8 text-[15px] font-semibold text-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
            >
              Book Demo
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {trustItems.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </div>
    </section>
  );
}
