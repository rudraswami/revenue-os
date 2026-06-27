"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  IndianRupee,
  MessageCircle,
  Shield,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { CTA } from "@/lib/brand-copy";
import { POSITIONING } from "@/lib/gtm-copy";
import { HeroIllustration } from "./illustrations/hero-illustration";

const logos = ["Real Estate", "EdTech", "Healthcare", "D2C", "Automotive", "Consulting"];

const capabilities = [
  { icon: MessageCircle, label: "Shared WhatsApp inbox" },
  { icon: Sparkles, label: "AI intent & lead score" },
  { icon: BarChart3, label: "Pipeline in ₹" },
  { icon: Users, label: "Team assign & tasks" },
  { icon: IndianRupee, label: "Razorpay → Won" },
  { icon: Zap, label: "Morning digest on WA" },
];

const stats = [
  { value: "500", label: "leads on trial" },
  { value: "14d", label: "free trial" },
  { value: "<15m", label: "to first classified lead" },
];

export function Hero() {
  return (
    <section className="relative overflow-x-hidden bg-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgb(0_108_73/0.1),transparent_60%)]" />
      <div className="absolute right-0 top-0 h-[600px] w-[600px] bg-[radial-gradient(circle_at_center,rgb(108_248_187/0.12),transparent_50%)]" />
      <div className="absolute left-0 top-[200px] h-[400px] w-[400px] bg-[radial-gradient(circle_at_center,rgb(229_238_255/0.4),transparent_50%)]" />

      <div className="relative mx-auto max-w-[1200px] px-6 pb-8 pt-14 text-center md:pb-12 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-gradient-to-r from-bento-mint/60 to-white px-4 py-2 text-[13px] font-semibold text-foreground shadow-sm">
            <ShieldCheck className="h-4 w-4 text-accent" />
            WhatsApp revenue layer · Official Meta APIs
          </span>

          <h1
            className="mx-auto max-w-[900px] text-foreground"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.08,
              fontFamily: "var(--font-sans)",
            }}
          >
            Meta replies in WhatsApp.
            <br />
            Growvisi tracks every deal in{" "}
            <span className="relative">
              <span className="bg-gradient-to-r from-accent via-[#0aa06a] to-[#128C7E] bg-clip-text text-transparent">
                ₹
              </span>
              <motion.span
                className="absolute -bottom-1 left-0 h-1 rounded-full bg-gradient-to-r from-accent to-[#128C7E]"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
              />
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-[680px] text-lg leading-relaxed text-muted-foreground md:text-xl">
            {POSITIONING.subhead}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="btn-primary group inline-flex items-center gap-2 rounded-xl px-8 py-4 text-[16px]"
            >
              {CTA.startTrial}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/demo" className="btn-outline inline-flex items-center gap-2 rounded-xl px-8 py-4 text-[16px]">
              {CTA.bookDemo}
              <ArrowRight className="ml-1 inline h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Shield className="h-3 w-3 text-accent" />
              {POSITIONING.trialNote}
            </span>
          </div>
        </motion.div>

        <motion.div
          className="mx-auto mt-10 flex max-w-lg justify-center gap-8 md:gap-12"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <p className="text-3xl font-extrabold tracking-tight text-accent md:text-4xl">{s.value}</p>
              <p className="mt-1 text-[12px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {capabilities.map((c, i) => (
            <motion.span
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-[12.5px] font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md"
            >
              <c.icon className="h-3.5 w-3.5 text-accent" />
              {c.label}
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          className="mt-10 sm:mt-12 md:mt-14"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative mx-auto max-w-[960px]">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-accent/5 to-transparent" />
            <div className="relative rounded-2xl border border-border bg-white p-1 shadow-[0_24px_80px_rgb(11_28_48/0.12)]">
              <HeroIllustration />
            </div>
            <motion.div
              className="absolute -right-4 -top-4 rounded-xl border border-accent/20 bg-white px-3 py-2 shadow-lg md:-right-6 md:-top-6"
              initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.8, type: "spring" }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-xs font-bold">Lead classified</p>
                  <p className="text-[10px] text-muted-foreground">High intent · Assigned to Priya</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              className="absolute -bottom-3 -left-3 rounded-xl border border-border bg-white px-3 py-2 shadow-lg md:-bottom-4 md:-left-5"
              initial={{ opacity: 0, scale: 0.8, rotate: 6 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 1, type: "spring" }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-xs font-bold">Revenue pulse</p>
                  <p className="text-[10px] text-muted-foreground">Pipeline ₹ · Won this month</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <p className="mx-auto mt-8 max-w-xl text-[12px] leading-relaxed text-muted-foreground">
          {POSITIONING.metaNote}
        </p>

        <motion.div
          className="mt-10 border-t border-border/60 pt-10 md:mt-14"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <p className="text-lg font-bold text-foreground">Built for Indian teams that sell on WhatsApp</p>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            Real estate, education, healthcare, D2C — same pipeline engine, your industry workflow
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
