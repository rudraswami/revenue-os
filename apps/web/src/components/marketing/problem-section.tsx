"use client";

import { motion } from "framer-motion";

const stages = [
  { label: "100 leads enter WhatsApp", pct: 100, tone: "bg-slate-400" },
  { label: "40 get a reply", pct: 40, tone: "bg-slate-500" },
  { label: "15 get followed up", pct: 15, tone: "bg-amber-500" },
  { label: "5 become customers", pct: 5, tone: "bg-accent" },
];

const leaks = ["No ownership", "No tracking", "No prioritization", "No follow-up"];

export function ProblemSection() {
  return (
    <section className="relative overflow-hidden bg-[#0b1c30] py-24 md:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(0_108_73/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgb(186_28_28/0.08),transparent_45%)]" />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-[720px] text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="display-lg text-white">
            Most WhatsApp leads{" "}
            <span className="text-red-400">never become customers</span>
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-white/60">
            Without a revenue system, conversations leak at every step.
          </p>
        </motion.div>

        <div className="mt-16 grid items-center gap-16 lg:grid-cols-2">
          {/* Visual funnel — full width bars, not cards */}
          <div className="space-y-5">
            {stages.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium text-white/90">{s.label}</span>
                  <span className="font-bold text-white">{s.pct}%</span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className={`h-full rounded-full ${s.tone}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${s.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.9, delay: i * 0.12, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Why — inline list, no card box */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-red-400/90">
              Where deals are lost
            </p>
            <ul className="mt-8 space-y-5">
              {leaks.map((item, i) => (
                <motion.li
                  key={item}
                  className="flex items-center gap-4 border-b border-white/10 pb-5 text-lg font-medium text-white last:border-0"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-300">
                    {i + 1}
                  </span>
                  {item}
                </motion.li>
              ))}
            </ul>
            <p className="mt-10 text-[15px] leading-relaxed text-white/55">
              Growvisi closes the gap — one inbox, one pipeline, one source of truth for every
              WhatsApp sale.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
