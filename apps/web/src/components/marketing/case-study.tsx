"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CTA } from "@/lib/brand-copy";
import { PILOT_METRICS_TEMPLATE } from "@/lib/marketing-nav";
import { SectionHeader } from "./section-header";

const PILOT_STEPS = [
  { week: "Week 1", title: "Connect + first classified lead", detail: "WhatsApp live, first AI classification in Inbox" },
  { week: "Week 2–3", title: "Team adopts Inbox + Pipeline", detail: "Take over on handoffs, move deals with ₹ values" },
  { week: "Week 4", title: "Compare vs baseline", detail: "Win rate & pipeline ₹ from Analytics — your data stays yours" },
] as const;

function MetricRing({
  label,
  note,
  index,
  reducedMotion,
}: {
  label: string;
  note: string;
  index: number;
  reducedMotion: boolean;
}) {
  const size = 112;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * 0.22;

  return (
    <motion.div
      className="flex flex-col items-center text-center"
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.55 }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgb(220 233 255)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#metric-ring-gradient-${index})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            initial={reducedMotion ? false : { strokeDashoffset: circumference }}
            whileInView={{ strokeDashoffset: circumference - dash }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.2 + index * 0.1, ease: [0.22, 1, 0.36, 1] }}
          />
          <defs>
            <linearGradient id={`metric-ring-gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#006c49" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6cf8bb" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
          <motion.span
            className="text-[10px] font-bold uppercase tracking-wider text-accent/70"
            animate={reducedMotion ? undefined : { opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            Pilot
          </motion.span>
          <span className="text-lg font-bold text-accent/50">—</span>
        </div>
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-foreground">{label}</p>
      <p className="mt-1.5 max-w-[160px] text-[11px] leading-relaxed text-muted-foreground">{note}</p>
    </motion.div>
  );
}

/**
 * Honest proof section — no fake company or vanity stats.
 * Replace placeholders when first pilot completes 30-day before/after.
 */
export function CaseStudy() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="case-study" className="scroll-mt-20 relative overflow-hidden py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgb(0_108_73/0.06),transparent_55%)]" />
      <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgb(108_248_187/0.12),transparent_70%)] blur-2xl" />

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-8">
        <SectionHeader
          label="Customer proof"
          title="Real pilots, real metrics"
          subtitle="We're onboarding 3–5 WhatsApp sales teams in India. This section fills with verified before/after data — not invented case studies."
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          {/* Pilot timeline — no boxes */}
          <div className="relative pl-2">
            <div className="absolute bottom-2 left-[11px] top-2 w-px bg-gradient-to-b from-accent/40 via-accent/20 to-transparent" />
            <ul className="space-y-10">
              {PILOT_STEPS.map((step, i) => (
                <motion.li
                  key={step.week}
                  className="relative flex gap-5 pl-8"
                  initial={reducedMotion ? false : { opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                >
                  <motion.span
                    className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-[0_0_20px_rgb(0_108_73/0.35)]"
                    initial={reducedMotion ? false : { scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", delay: 0.15 + i * 0.1, stiffness: 400, damping: 22 }}
                  >
                    {i + 1}
                  </motion.span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-accent">{step.week}</p>
                    <p className="mt-1 text-lg font-bold text-foreground">{step.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                  </div>
                </motion.li>
              ))}
            </ul>

            <motion.p
              className="mt-10 max-w-md text-sm leading-relaxed text-muted-foreground"
              initial={reducedMotion ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
            >
              A 30-day structured rollout: connect WhatsApp → classify in Inbox → human Take over on
              handoffs → move pipeline → optional digest. We measure outcomes in Growvisi Analytics.
            </motion.p>
          </div>

          {/* Measurement + CTA — gradient panel, not a rectangle card */}
          <motion.div
            className="relative overflow-hidden rounded-[2rem] px-8 py-10 md:px-10"
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.12] via-[#ecfdf5]/80 to-white" />
            <div className="marketing-shimmer pointer-events-none absolute inset-0 opacity-40" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                <p className="text-xs font-bold uppercase tracking-widest text-accent">What we measure</p>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                We publish verified customer stories here — with permission, a short quote, and
                before/after numbers from Analytics. Join our pilot cohort if you want to be first.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="shadow-[0_8px_24px_rgb(0_108_73/0.25)]">
                  <Link href="/register">
                    {CTA.startTrial}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/80 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur-sm transition hover:border-accent/30"
                >
                  {CTA.bookDemo}
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Metrics — circular gauges, not stat boxes */}
        <div className="mt-16 border-t border-border/60 pt-14">
          <p className="mb-10 text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            30-day pilot metrics · published after first cohort
          </p>
          <div className="grid grid-cols-2 gap-10 lg:grid-cols-4 lg:gap-6">
            {PILOT_METRICS_TEMPLATE.map((m, i) => (
              <MetricRing
                key={m.key}
                label={m.label}
                note={m.note}
                index={i}
                reducedMotion={!!reducedMotion}
              />
            ))}
          </div>
        </div>

        <p className="mt-12 text-center text-[12px] text-muted-foreground">
          Ideal pilot ICP: 3–12 person team · 100+ WhatsApp leads/month · real estate, edtech, or D2C ·
          Bangalore / Tier-1 India
        </p>
      </div>
    </section>
  );
}
