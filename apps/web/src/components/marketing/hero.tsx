"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { HeroIllustration } from "./illustrations/hero-illustration";

const logos = ["Real Estate", "EdTech", "Healthcare", "D2C", "Automotive", "Consulting"];

export function Hero() {
  return (
    <section className="relative overflow-x-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgb(0_108_73/0.08),transparent_60%)]" />

      <div className="relative mx-auto max-w-[1120px] px-6 pb-8 pt-16 text-center md:pb-12 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="display-xl mx-auto max-w-[820px] text-foreground">
            <span className="text-accent">3X Your Revenue</span>
            <br />
            with the Power of WhatsApp
          </h1>
          <p className="body-lg mx-auto mt-5 max-w-[640px]">
            Classify, score, and close every WhatsApp lead — AI-powered pipeline for Indian sales
            teams. Powered by Official WhatsApp APIs.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="btn-primary inline-flex items-center gap-2 rounded-lg px-7 py-3.5 text-[15px]"
            >
              Start 14-Day FREE Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/demo" className="btn-outline rounded-lg px-7 py-3.5 text-[15px]">
              Join Live Demo
              <ArrowRight className="ml-1 inline h-4 w-4" />
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="mt-8 sm:mt-10 md:mt-12 lg:mt-14"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <HeroIllustration />
        </motion.div>

        {/* Social proof strip — like reference */}
        <motion.div
          className="mt-6 border-t border-border/60 pt-10 md:mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <p className="text-lg font-bold text-foreground">Sales teams across India trust Growvisi</p>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            Built for teams that close deals on WhatsApp — not just send broadcasts
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70 grayscale">
            {logos.map((name) => (
              <span key={name} className="text-[15px] font-semibold tracking-tight text-muted-foreground">
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
