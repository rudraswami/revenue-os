"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { HeroIllustration } from "./illustrations/hero-illustration";

const trustItems = [
  "Official WhatsApp API",
  "Setup in 15 minutes",
  "Multi-agent inbox",
  "AI lead scoring",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Cinematic background */}
      <div className="absolute inset-0 bg-[#f8f9ff]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgb(0_108_73/0.12),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_80%,rgb(11_28_48/0.06),transparent_55%)]" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-6 py-20 lg:grid-cols-[1fr_1.05fr] lg:gap-8 lg:px-8 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="section-label">AI Revenue Engine</p>
          <h1 className="display-xl mt-3 text-foreground">
            Turn WhatsApp Conversations Into Revenue
          </h1>
          <p className="body-lg mt-6 max-w-[500px]">
            Your team replies on WhatsApp. Growvisi reads every thread, scores intent, moves deals
            through pipeline, and surfaces who to call next.
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href="/register"
              className="btn-primary inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-[15px]"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/demo" className="btn-outline rounded-lg px-7 py-3.5 text-[15px]">
              See it live
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-5 gap-y-2">
            {trustItems.map((item, i) => (
              <motion.li
                key={item}
                className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.08 }}
              >
                <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.5} />
                {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative lg:pl-4"
        >
          <HeroIllustration />
        </motion.div>
      </div>
    </section>
  );
}
