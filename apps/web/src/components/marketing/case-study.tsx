"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ClipboardList } from "lucide-react";
import { CTA } from "@/lib/brand-copy";
import { PILOT_METRICS_TEMPLATE } from "@/lib/marketing-nav";
import { SectionHeader } from "./section-header";

/**
 * Honest proof section — no fake company or vanity stats.
 * Replace placeholders when first pilot completes 30-day before/after.
 */
export function CaseStudy() {
  return (
    <section id="case-study" className="scroll-mt-20 relative overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgb(0_108_73/0.07),transparent_55%)]" />

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-8">
        <SectionHeader
          label="Customer proof"
          title="Real pilots, real metrics"
          subtitle="We're onboarding 3–5 WhatsApp sales teams in India. This section fills with verified before/after data — not invented case studies."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <motion.div
            className="rounded-3xl border border-[#dce9ff] bg-white p-6 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-start gap-3">
              <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="font-bold text-foreground">What a pilot is</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  A 30-day structured rollout: connect WhatsApp → classify in Inbox → human Take over
                  on handoffs → move pipeline → optional digest. We measure outcomes in Growvisi
                  Analytics — you keep your data.
                </p>
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li>· Week 1: connect + first classified lead</li>
              <li>· Week 2–3: team adopts Inbox + Pipeline daily</li>
              <li>· Week 4: compare win rate & pipeline ₹ vs baseline</li>
            </ul>
          </motion.div>

          <motion.div
            className="rounded-3xl border border-accent/20 bg-[#ecfdf5]/50 p-6"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-accent">What we measure</p>
            <p className="mt-2 text-sm text-muted-foreground">
              GreenSpace was a placeholder name. Your first real customer story goes here with their
              permission — logo, quote, and numbers from Analytics.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm">
                {CTA.startTrial}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/contact" className="btn-outline inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm">
                {CTA.bookDemo}
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PILOT_METRICS_TEMPLATE.map((m, i) => (
            <motion.div
              key={m.key}
              className="rounded-2xl border border-[#dce9ff] bg-white p-5 shadow-sm"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {m.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-accent/40">Pending pilot</p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{m.note}</p>
            </motion.div>
          ))}
        </div>

        <p className="mt-6 text-center text-[12px] text-muted-foreground">
          Ideal pilot ICP: 3–12 person team · 100+ WhatsApp leads/month · real estate, edtech, or D2C ·
          Bangalore / Tier-1 India
        </p>
      </div>
    </section>
  );
}
