import Link from "next/link";
import { ArrowRight, Inbox, Link2, MessageSquare } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const steps = [
  {
    icon: Link2,
    step: "01",
    title: "Connect WhatsApp",
    description:
      "Link your business number in minutes with Meta embedded signup. No technical setup required.",
    color: "bg-primary-soft text-primary",
  },
  {
    icon: Inbox,
    step: "02",
    title: "Messages flow in",
    description:
      "Every customer message lands in one team inbox. Assign, reply, and never lose the thread.",
    color: "bg-bento-mint text-success",
  },
  {
    icon: MessageSquare,
    step: "03",
    title: "Close more deals",
    description:
      "AI scores leads, suggests replies, and moves deals through your pipeline automatically.",
    color: "bg-bento-blue text-primary",
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-[1120px] px-6">
        <ScrollReveal className="mx-auto max-w-[560px] text-center">
          <p className="section-label">How it works</p>
          <h2 className="display-lg mt-3 text-foreground">
            Up and running in three steps
          </h2>
          <p className="body-lg mt-4">
            From signup to your first customer reply — most teams are live within 15 minutes.
          </p>
        </ScrollReveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <ScrollReveal key={s.step} delay={i * 0.1}>
              <div className="group h-full rounded-2xl border border-border bg-white p-7 shadow-sm transition-shadow hover:shadow-md">
                <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="text-[12px] font-bold text-muted-foreground">{s.step}</p>
                <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="mt-10 text-center" delay={0.2}>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-[15px] font-semibold text-primary hover:underline"
          >
            Start free — no credit card <ArrowRight className="h-4 w-4" />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
