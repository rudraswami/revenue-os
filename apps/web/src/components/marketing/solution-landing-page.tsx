"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { SolutionPageSlug } from "@/lib/solution-pages";
import { SOLUTION_PAGES, SOLUTION_SLUGS } from "@/lib/solution-pages";
import { MarketingIcon } from "@/lib/marketing-icons";
import { CTA } from "@/lib/brand-copy";
import { HANDOFF_EXPLAINER } from "@/lib/gtm-copy";
import { MarketingHeader } from "./header";
import { MarketingFooter } from "./footer";
import { SolutionHeroVisual, SolutionWorkflowDiagram } from "./solution-visuals";

export function SolutionLandingPage({ slug }: { slug: SolutionPageSlug }) {
  const solution = SOLUTION_PAGES[slug];
  const siblings = SOLUTION_SLUGS.filter((s) => s !== slug).map((s) => SOLUTION_PAGES[s]);

  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main>
        {/* Dark hero — 11x-style industry narrative */}
        <section
          className={`relative overflow-hidden bg-gradient-to-br ${solution.heroGradient} py-16 text-white md:py-24`}
        >
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: `radial-gradient(ellipse 70% 60% at 85% 15%, ${solution.accentColor}33, transparent 60%)`,
            }}
          />
          <div className="relative mx-auto grid max-w-[1100px] items-center gap-12 px-6 lg:grid-cols-2 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
                style={{ borderColor: `${solution.accentColor}55`, color: solution.accentColor }}
              >
                <MarketingIcon name={solution.icon} className="h-3.5 w-3.5" />
                {solution.navLabel}
              </span>
              <h1
                className="mt-5 text-white"
                style={{
                  fontSize: "clamp(2rem, 4vw, 2.85rem)",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.08,
                }}
              >
                {solution.headline}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-white/70">{solution.subhead}</p>
              <div className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
                <p className="text-xs text-white/50">{solution.heroStat.label}</p>
                <p className="ml-3 text-sm font-bold" style={{ color: solution.accentColor }}>
                  {solution.heroStat.value}
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-[#0b1c30] transition-opacity hover:opacity-90"
                  style={{ backgroundColor: solution.accentColor }}
                >
                  {CTA.startTrial}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  {CTA.bookDemo}
                </Link>
              </div>
              <p className="mt-4 text-sm text-white/45">{solution.proofLine}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md"
            >
              <SolutionHeroVisual slug={solution.slug} />
            </motion.div>
          </div>
        </section>

        {/* Pain → outcome split */}
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-[1100px] px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-500/80">Without a system</p>
                <h2 className="mt-2 text-2xl font-bold">What breaks on WhatsApp</h2>
                <ul className="mt-6 space-y-3">
                  {solution.pains.map((pain) => (
                    <li key={pain} className="flex gap-3 text-[15px] leading-relaxed text-muted-foreground">
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400/80" />
                      {pain}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-gradient-to-br from-[#f8f9ff] to-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-accent">With Growvisi</p>
                <h2 className="mt-2 text-2xl font-bold">What changes in 30 days</h2>
                <ul className="mt-6 space-y-3">
                  {solution.outcomes.map((outcome) => (
                    <li key={outcome} className="flex gap-3 text-[15px] leading-relaxed">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="border-y border-border bg-[#f8f9ff] py-16 md:py-20">
          <div className="mx-auto max-w-[1100px] px-6 lg:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
              How it works for {solution.navLabel.toLowerCase()}
            </p>
            <h2 className="mt-2 text-center text-2xl font-bold">From WhatsApp ping to revenue ₹</h2>
            <div className="mt-10">
              <SolutionWorkflowDiagram slug={solution.slug} />
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {solution.workflow.map((step, i) => (
                <motion.div
                  key={step.step}
                  className="rounded-2xl border border-border bg-white p-5 shadow-sm"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                >
                  <p className="text-xs font-bold text-accent">{step.step}</p>
                  <p className="mt-2 font-bold">{step.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features bento */}
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-[1100px] px-6 lg:px-8">
            <h2 className="text-2xl font-bold">Built for {solution.idealCustomer.toLowerCase()}</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {solution.features.map((f, i) => (
                <motion.div
                  key={f.title}
                  className="rounded-2xl border border-border bg-white p-5 shadow-sm"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  <p className="mt-3 font-bold">{f.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Human handoff callout — honest Meta boundary */}
        <section className="border-t border-border bg-white py-14">
          <div className="mx-auto max-w-[720px] px-6 text-center lg:px-8">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Human replies</p>
            <h2 className="mt-2 text-xl font-bold">AI classifies — your team closes</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{HANDOFF_EXPLAINER.short}</p>
            <ol className="mt-6 space-y-2 text-left text-sm text-muted-foreground">
              {HANDOFF_EXPLAINER.steps.map((step) => (
                <li key={step} className="flex gap-2">
                  <span className="font-bold text-accent">→</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA band */}
        <section
          className="py-16"
          style={{ background: `linear-gradient(135deg, ${solution.accentColor}18, #f8f9ff)` }}
        >
          <div className="mx-auto max-w-[640px] px-6 text-center lg:px-8">
            <h2 className="text-2xl font-bold">Start with {solution.navLabel.toLowerCase()} on WhatsApp</h2>
            <p className="mt-3 text-muted-foreground">
              14-day trial · 500 leads · 1 WhatsApp number · no card
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3">
                {CTA.startTrial}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/#pricing" className="btn-outline inline-flex items-center rounded-xl px-6 py-3">
                See pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Sibling solutions */}
        <section className="border-t border-border bg-white py-14">
          <div className="mx-auto max-w-[1100px] px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">More industries</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {siblings
                .filter((s) => s.slug !== solution.slug)
                .map((s) => (
                  <Link
                    key={s.slug}
                    href={`/solutions/${s.slug}`}
                    className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-bento-mint/30"
                  >
                    {s.navLabel}
                  </Link>
                ))}
              <Link
                href="/agencies"
                className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium transition-colors hover:border-accent/40 hover:bg-bento-mint/30"
              >
                Agencies & partners
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
