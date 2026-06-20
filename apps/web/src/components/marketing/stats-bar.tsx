"use client";

import { motion } from "framer-motion";
import { ScrollReveal } from "./scroll-reveal";

const stats = [
  { value: "98%", label: "Message open rate", sub: "vs 20% email" },
  { value: "3×", label: "Faster response", sub: "with shared inbox" },
  { value: "34%", label: "Higher conversion", sub: "with AI scoring" },
  { value: "15 min", label: "Setup time", sub: "connect & go live" },
];

export function StatsBar() {
  return (
    <section className="border-y border-border/60 bg-white py-12 md:py-14">
      <div className="mx-auto max-w-[1120px] px-6">
        <ScrollReveal className="mb-10 text-center">
          <h2 className="text-xl font-bold md:text-2xl">Why WhatsApp is your best sales channel</h2>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Growvisi turns that attention into structured revenue.
          </p>
        </ScrollReveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="card-lift rounded-2xl border border-border bg-gradient-to-b from-white to-muted/30 p-6 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <p className="text-3xl font-bold tracking-tight text-primary md:text-4xl">{stat.value}</p>
              <p className="mt-2 text-[14px] font-semibold text-foreground">{stat.label}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{stat.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
