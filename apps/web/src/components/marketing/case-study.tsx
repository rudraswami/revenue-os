"use client";

import { motion } from "framer-motion";

const before = ["Leads on personal phones", "No pipeline", "Follow-ups missed"];
const after = ["Shared inbox", "AI qualification", "Pipeline visibility"];

const stats = [
  { value: "35%", label: "Faster response" },
  { value: "22%", label: "Higher conversion" },
  { value: "90%", label: "Fewer missed follow-ups" },
  { value: "40%", label: "Team productivity" },
];

export function CaseStudy() {
  return (
    <section id="case-study" className="scroll-mt-20 relative overflow-hidden py-24 md:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgb(0_108_73/0.08),transparent_55%)]" />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="section-label">Case study</p>
          <h2 className="display-lg mt-2">GreenSpace Properties</h2>
        </motion.div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Before</p>
            <ul className="mt-6 space-y-4">
              {before.map((item) => (
                <li key={item} className="flex items-center gap-3 text-[16px] text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <div className="hidden h-32 w-px bg-border lg:block" aria-hidden />

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-accent">After Growvisi</p>
            <ul className="mt-6 space-y-4">
              {after.map((item) => (
                <li key={item} className="flex items-center gap-3 text-[16px] font-medium">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-8 border-t border-border pt-16 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="text-center"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <p className="text-4xl font-bold tracking-tight text-accent md:text-5xl">{s.value}</p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
