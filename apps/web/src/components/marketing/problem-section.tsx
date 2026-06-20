"use client";

import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";

const funnel = [
  { label: "Total Leads Generated", value: 100, color: "bg-slate-300" },
  { label: "Responded To", value: 40, color: "bg-slate-400" },
  { label: "Followed Up", value: 15, color: "bg-amber-400" },
  { label: "Converted Customers", value: 5, color: "bg-accent" },
];

const dropOff = [
  "No ownership",
  "No tracking",
  "No prioritization",
  "No follow-up",
];

export function ProblemSection() {
  return (
    <section className="border-b border-border bg-[#f8f9ff] py-20 md:py-28">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal className="mx-auto max-w-[720px] text-center">
          <h2 className="display-lg text-foreground">
            Most WhatsApp Leads{" "}
            <span className="text-destructive">Never Become Customers</span>
          </h2>
        </ScrollReveal>

        <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:items-start">
          <ScrollReveal>
            <div className="elev-1 rounded-2xl bg-white p-8">
              <div className="space-y-6">
                {funnel.map((row, i) => (
                  <div key={row.label}>
                    <div className="mb-2 flex justify-between text-[13px]">
                      <span className="font-medium text-foreground">{row.label}</span>
                      <span className="font-semibold text-muted-foreground">{row.value}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className={`h-full rounded-full ${row.color}`}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${row.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="elev-1 rounded-2xl bg-white p-8">
              <h3 className="text-lg font-bold text-foreground">Why Leads Drop Off</h3>
              <ul className="mt-6 space-y-4">
                {dropOff.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[15px] font-medium">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-destructive">
                      ×
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-[14px] leading-relaxed text-muted-foreground">
                Without a revenue system, your best leads get lost in personal phones and scattered
                chats.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
