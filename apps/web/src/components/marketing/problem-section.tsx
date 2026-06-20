"use client";

import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";

const funnelSteps = [
  { label: "100", sub: "WhatsApp leads", width: "100%" },
  { label: "40", sub: "Get a reply", width: "72%" },
  { label: "15", sub: "Followed up", width: "48%" },
  { label: "5", sub: "Convert", width: "28%" },
];

const painPoints = ["No ownership", "No tracking", "No prioritization", "No follow-up"];

export function ProblemSection() {
  return (
    <section className="relative overflow-hidden bg-[#1a1a2e] py-24 text-white md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(96_67_208/0.25),transparent_55%)]" />

      <div className="relative mx-auto max-w-[1120px] px-6">
        <ScrollReveal className="mx-auto max-w-[640px] text-center">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-[#25D366]">The problem</p>
          <h2 className="display-lg mt-3 text-white">
            Most WhatsApp Leads Never Become Customers
          </h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:items-center">
          <ScrollReveal>
            <div className="space-y-3">
              {funnelSteps.map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, width: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                >
                  <div
                    className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm"
                    style={{ width: step.width, minWidth: "140px" }}
                  >
                    <p className="text-2xl font-bold">{step.label}</p>
                    <p className="text-[13px] text-white/60">{step.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
              <p className="text-sm font-bold uppercase tracking-wider text-[#f5c842]">Why?</p>
              <ul className="mt-6 space-y-4">
                {painPoints.map((point, i) => (
                  <motion.li
                    key={point}
                    className="flex items-center gap-3 text-[16px] font-medium"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-300">
                      ×
                    </span>
                    {point}
                  </motion.li>
                ))}
              </ul>
              <p className="mt-8 text-[14px] leading-relaxed text-white/65">
                Growvisi fixes this with one revenue system — inbox, AI scoring, and pipeline in one
                place.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
