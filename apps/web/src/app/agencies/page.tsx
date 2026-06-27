import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Handshake, Layers, Users } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { CTA } from "@/lib/brand-copy";
import { OUTCOME_TIERS, POSITIONING } from "@/lib/gtm-copy";

const benefits = [
  {
    icon: Layers,
    title: "15 client workspaces",
    description: "Provision a branded pipeline + inbox per client from one Operator login.",
  },
  {
    icon: Handshake,
    title: "Partner install kit",
    description: "Meta Business Agent + Growvisi stack — documented handoff for your team.",
  },
  {
    icon: Users,
    title: "50 seats · 50 numbers",
    description: "Scale ops without juggling spreadsheets and personal phones.",
  },
];

export default function AgenciesPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        <section className="relative overflow-hidden bg-white py-16 md:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgb(0_108_73/0.08),transparent_60%)]" />
          <div className="relative mx-auto max-w-[900px] px-6 text-center lg:px-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-bento-mint/40 px-4 py-1.5 text-xs font-semibold text-accent">
              <Building2 className="h-3.5 w-3.5" />
              For Meta partners & WhatsApp agencies
            </span>
            <h1
              className="mt-6 text-foreground"
              style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.03em" }}
            >
              {OUTCOME_TIERS.operator.promise}
            </h1>
            <p className="mx-auto mt-5 max-w-[640px] text-lg text-muted-foreground">
              {POSITIONING.subhead} Operator adds multi-client workspaces, API keys, and a partner
              install kit so you deliver pipeline ₹ reporting — not just chat setup.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/register" className="btn-primary inline-flex items-center gap-2 rounded-xl px-8 py-4">
                Start Operator trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/contact" className="btn-outline inline-flex items-center gap-2 rounded-xl px-8 py-4">
                {CTA.bookDemo}
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              ₹{OUTCOME_TIERS.operator.priceInr.toLocaleString("en-IN")}/mo · {POSITIONING.trialNote}
            </p>
          </div>
        </section>

        <section className="border-y border-border bg-[#f8f9ff] py-16">
          <div className="mx-auto max-w-[1000px] px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold">What agencies get on Operator</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {benefits.map((b) => (
                <div key={b.title} className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                  <b.icon className="h-6 w-6 text-accent" />
                  <p className="mt-4 font-bold">{b.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-[700px] px-6 lg:px-8">
            <h2 className="text-xl font-bold">Honest boundary with Meta</h2>
            <p className="mt-3 text-muted-foreground">{POSITIONING.metaNote}</p>
            <ul className="mt-6 space-y-3">
              {[
                "You configure Meta Business Agent welcome & replies in WhatsApp.",
                "Growvisi ingests messages, classifies intent, and updates pipeline.",
                "Morning digest can land on owner WhatsApp — in Hindi if needed.",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/login" className="text-sm font-semibold text-accent hover:underline">
                Sign in to Agency hub →
              </Link>
              <Link href="/dashboard/partner" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
                Partner install kit (logged in)
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
