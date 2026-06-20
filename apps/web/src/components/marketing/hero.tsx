"use client";

import Link from "next/link";
import { ArrowRight, Check, Play } from "lucide-react";
import { motion } from "framer-motion";
import { HeroVisual } from "./hero-visual";

const trustItems = [
  "Official WhatsApp API",
  "Setup in 15 Minutes",
  "Multi-Agent Inbox",
  "AI Lead Scoring",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-8 pt-8 md:pt-12">
      <div className="pointer-events-none absolute inset-0 mesh-hero" />

      <div className="relative mx-auto max-w-[1120px] px-6">
        <motion.div
          className="mx-auto max-w-[800px] text-center"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.p
            className="section-label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            The AI Revenue Engine for WhatsApp Sales Teams
          </motion.p>

          <h1 className="display-xl mt-4 text-foreground">
            Turn WhatsApp Conversations{" "}
            <span className="bg-gradient-to-r from-[#128C7E] via-primary to-[#7c3aed] bg-clip-text text-transparent">
              Into Revenue
            </span>
          </h1>

          <p className="body-lg mx-auto mt-6 max-w-[600px]">
            Growvisi analyzes every chat, scores buying intent, updates your pipeline, and alerts
            your team — so hot leads never slip away.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/register"
              className="btn-wa inline-flex h-[52px] items-center gap-2 rounded-full px-8 text-[15px] font-bold"
            >
              Start 14-Day Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-[52px] items-center gap-2 rounded-full border-2 border-border bg-white px-8 text-[15px] font-semibold text-foreground shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Play className="h-3.5 w-3.5 fill-primary" />
              </span>
              Join Live Demo
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
            {trustItems.map((item, i) => (
              <motion.li
                key={item}
                className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E]">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <HeroVisual />
      </div>
    </section>
  );
}
