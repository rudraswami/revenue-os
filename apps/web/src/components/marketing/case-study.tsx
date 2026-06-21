"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { AnimatedCounter } from "./animated-counter";
import { SectionHeader } from "./section-header";

const before = ["Leads trapped on personal phones", "No pipeline visibility", "Follow-ups missed daily"];
const after = ["Shared team inbox", "AI qualifies every lead", "Pipeline updates automatically"];

const stats = [
  { value: 35, suffix: "%", label: "Faster response" },
  { value: 22, suffix: "%", label: "Higher conversion" },
  { value: 90, suffix: "%", label: "Fewer missed follow-ups" },
  { value: 40, suffix: "%", label: "Team productivity" },
];

export function CaseStudy() {
  return (
    <section id="case-study" className="scroll-mt-20 relative overflow-hidden py-20 md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgb(0_108_73/0.07),transparent_55%)]" />

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-8">
        <SectionHeader
          label="Case study"
          title="GreenSpace Properties"
          subtitle="A 12-agent real estate team in Bangalore — 200+ WhatsApp leads per week."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          <motion.div
            className="rounded-3xl border border-red-200/80 bg-red-50/50 p-6"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-red-500">Before Growvisi</p>
            <ul className="mt-5 space-y-3">
              {before.map((item) => (
                <li key={item} className="flex items-center gap-3 text-[15px] text-red-900/80">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-red-400" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <div className="hidden items-center justify-center lg:flex">
            <motion.div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ArrowRight className="h-5 w-5" />
            </motion.div>
          </div>

          <motion.div
            className="rounded-3xl border border-accent/25 bg-[#ecfdf5] p-6"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-accent">After Growvisi</p>
            <ul className="mt-5 space-y-3">
              {after.map((item) => (
                <li key={item} className="flex items-center gap-3 text-[15px] font-medium text-[#0b1c30]">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="rounded-2xl border border-[#dce9ff] bg-white p-5 text-center shadow-sm"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <p className="text-3xl font-bold tracking-tight text-accent md:text-4xl">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-[13px] font-medium text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
