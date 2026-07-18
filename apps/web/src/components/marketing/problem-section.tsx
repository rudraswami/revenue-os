"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { HOME_PROBLEM } from "@/lib/brand-copy";
import { SectionHeader } from "./section-header";

export function ProblemSection() {
  return (
    <section id="problem" className="relative overflow-hidden bg-[#0b1c30] py-20 md:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(0_108_73/0.14),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgb(186_28_28/0.07),transparent_50%)]" />

      <div className="relative mx-auto max-w-[1100px] px-6 lg:px-8">
        <SectionHeader
          light
          label={HOME_PROBLEM.label}
          title={HOME_PROBLEM.title}
          subtitle={HOME_PROBLEM.subtitle}
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <ul className="space-y-3">
            {HOME_PROBLEM.pains.map((item, i) => (
              <motion.li
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 + i * 0.06 }}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-300">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-white/55">{item.desc}</p>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>

          <motion.div
            className="rounded-3xl border border-accent/25 bg-accent/10 p-6 md:p-8"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-[15px] leading-relaxed text-[#c8f5e4]">{HOME_PROBLEM.bridge}</p>
            <Link
              href="#revenue-impact"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6cf8bb] px-5 py-3 text-sm font-semibold text-[#0b1c30] transition hover:bg-[#5ae8ab]"
            >
              {HOME_PROBLEM.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-[12px] leading-relaxed text-white/45">
              Use your own leads, deal size, and team — honest model, not a guarantee.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
