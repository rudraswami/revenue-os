"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { ProductShowcase } from "./product-showcase";
import {
  AnalyticsPreview,
  IntelligencePreview,
  PipelinePreview,
  ScoringPreview,
} from "./dashboard-previews";

const stories = [
  {
    id: "intelligence",
    label: "01 · Intelligence",
    title: "Every conversation, understood",
    body: "AI reads WhatsApp threads as they arrive — purchase intent, urgency, sentiment — and tags each contact automatically.",
    Visual: IntelligencePreview,
    bg: "from-[#eff4ff] to-white",
    reverse: false,
  },
  {
    id: "scoring",
    label: "02 · Lead scoring",
    title: "Know who to call first",
    body: "Scores update in real time so reps spend time on buyers ready to close, not browsers.",
    Visual: ScoringPreview,
    bg: "from-[#ecfdf5] to-white",
    reverse: true,
  },
  {
    id: "pipeline",
    label: "03 · Pipeline",
    title: "Deals move without manual updates",
    body: "Kanban stages sync with conversation intent. Drag when you need to — AI handles the rest.",
    Visual: PipelinePreview,
    bg: "from-[#e8f0ff] to-white",
    reverse: false,
  },
  {
    id: "analytics",
    label: "04 · Revenue",
    title: "See conversion, not just messages",
    body: "Funnel metrics, pipeline value, and team performance — tied to WhatsApp, not spreadsheets.",
    Visual: AnalyticsPreview,
    bg: "from-[#f0fdf4] to-white",
    reverse: true,
  },
];

export function ProductStory() {
  return (
    <section id="product" className="scroll-mt-20">
      <div className="border-b border-border bg-white py-16 text-center md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-[640px] px-6"
        >
          <p className="section-label">Product</p>
          <h2 className="display-lg mt-2">Built to close, not just chat</h2>
          <p className="body-lg mt-4">
            Four layers that turn WhatsApp into a revenue system.
          </p>
        </motion.div>
      </div>

      {stories.map((story) => {
        const Visual = story.Visual;
        return (
          <div
            key={story.id}
            className={`relative overflow-hidden border-b border-border bg-gradient-to-br ${story.bg} py-20 md:py-28`}
          >
            <div className="mx-auto grid max-w-[1280px] items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
              <motion.div
                className={story.reverse ? "lg:order-2" : ""}
                initial={{ opacity: 0, x: story.reverse ? 32 : -32 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6 }}
              >
                <p className="section-label">{story.label}</p>
                <h3 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">{story.title}</h3>
                <p className="mt-4 max-w-[440px] text-[16px] leading-relaxed text-muted-foreground">
                  {story.body}
                </p>
              </motion.div>

              <motion.div
                className={`relative ${story.reverse ? "lg:order-1" : ""}`}
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.65, delay: 0.1 }}
              >
                <div className="absolute -inset-4 rounded-3xl bg-accent/5 blur-2xl" />
                <div className="relative overflow-hidden rounded-2xl bg-white/80 p-6 shadow-[0_24px_64px_rgb(11_28_48/0.08)] backdrop-blur-sm ring-1 ring-white">
                  <Visual />
                </div>
              </motion.div>
            </div>
          </div>
        );
      })}

      {/* Full-width live product strip */}
      <div className="relative overflow-hidden bg-[#0b1c30] py-20 md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(0_108_73/0.2),transparent_70%)]" />
        <div className="relative mx-auto max-w-[1280px] px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h3 className="text-2xl font-bold text-white md:text-3xl">Your team&apos;s command center</h3>
            <p className="mt-3 text-white/60">Inbox, intelligence, pipeline, and analytics — one workspace.</p>
          </div>
          <div className="overflow-hidden rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur md:p-6">
            <ProductShowcase />
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#6cf8bb] hover:underline"
            >
              Open interactive demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
