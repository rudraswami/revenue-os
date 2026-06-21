"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "./section-header";

const stages = [
  { label: "100 leads enter WhatsApp", pct: 100, tone: "bg-white/25" },
  { label: "40 get a reply", pct: 40, tone: "bg-slate-400" },
  { label: "15 get followed up", pct: 15, tone: "bg-amber-500" },
  { label: "5 become customers", pct: 5, tone: "bg-accent" },
];

const leaks = [
  { title: "No ownership", desc: "Leads sit on personal phones" },
  { title: "No tracking", desc: "Managers can't see the pipeline" },
  { title: "No prioritization", desc: "Hot buyers wait behind cold chats" },
  { title: "No follow-up", desc: "Deals die in silence" },
];

export function ProblemSection() {
  return (
    <section className="relative overflow-hidden bg-[#0b1c30] py-20 md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(0_108_73/0.14),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgb(186_28_28/0.07),transparent_50%)]" />

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-8">
        <SectionHeader
          light
          label="The problem"
          title={
            <>
              Most WhatsApp leads{" "}
              <span className="text-red-400">never become customers</span>
            </>
          }
          subtitle="Without a revenue system, 95% of intent leaks before anyone closes."
        />

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
              Revenue leak funnel
            </p>
            <div className="mt-5 space-y-4">
              {stages.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium text-white/90">{s.label}</span>
                    <motion.span
                      className="font-bold text-white"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                    >
                      {s.pct}%
                    </motion.span>
                  </div>
                  <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className={`h-full rounded-full ${s.tone}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${s.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.85, delay: 0.15 + i * 0.1, ease: "easeOut" }}
                    />
                    {i > 0 && (
                      <motion.div
                        className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-red-400"
                        animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-red-400/90">
              Where deals are lost
            </p>
            <ul className="mt-6 space-y-3">
              {leaks.map((item, i) => (
                <motion.li
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  whileHover={{ borderColor: "rgb(255 255 255 / 0.2)", x: 4 }}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-300">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-0.5 text-[13px] text-white/55">{item.desc}</p>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
            <motion.p
              className="mt-8 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-[14px] leading-relaxed text-[#a8e6cf]"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              Growvisi plugs every leak — one inbox, one pipeline, one source of truth.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}
