"use client";

import { motion } from "framer-motion";
import { Bell, MessageCircle, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { ProductShowcase } from "./product-showcase";

const floats = [
  {
    id: "score",
    className: "left-[2%] top-[8%] md:left-[4%] md:top-[12%]",
    delay: 0,
    content: (
      <div className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-md">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
          <Target className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Lead score</p>
          <p className="text-lg font-bold text-foreground">92</p>
        </div>
      </div>
    ),
  },
  {
    id: "chat",
    className: "right-[2%] top-[6%] md:right-[6%] md:top-[10%]",
    delay: 0.15,
    content: (
      <div className="max-w-[200px] rounded-2xl border border-[#25D366]/30 bg-white p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[12px] font-semibold">Sarah M.</p>
            <p className="text-[10px] text-muted-foreground">Purchase intent</p>
          </div>
        </div>
        <p className="mt-2 rounded-xl rounded-tl-sm bg-[#d9fdd3] px-3 py-2 text-[11px] leading-snug">
          Can I get a quote for 50 units?
        </p>
      </div>
    ),
  },
  {
    id: "alert",
    className: "left-[0%] bottom-[18%] md:left-[2%] md:bottom-[22%]",
    delay: 0.3,
    content: (
      <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 shadow-md">
        <Bell className="h-4 w-4 text-amber-600" />
        <span className="text-[12px] font-semibold text-amber-900">Hot lead alert</span>
      </div>
    ),
  },
  {
    id: "won",
    className: "right-[0%] bottom-[20%] md:right-[4%] md:bottom-[24%]",
    delay: 0.45,
    content: (
      <div className="flex items-center gap-2 rounded-2xl border border-success/30 bg-white px-4 py-3 shadow-lg">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-success">
          <Trophy className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Deal won</p>
          <p className="text-sm font-bold text-success">₹48,500</p>
        </div>
      </div>
    ),
  },
  {
    id: "roi",
    className: "left-1/2 top-[2%] -translate-x-1/2",
    delay: 0.2,
    content: (
      <div className="flex items-center gap-1.5 rounded-full bg-[#1a1a2e] px-4 py-2 text-white shadow-xl">
        <Zap className="h-3.5 w-3.5 text-[#f5c842]" />
        <span className="text-[12px] font-bold">+34% conversion</span>
      </div>
    ),
  },
  {
    id: "pipeline",
    className: "right-[12%] top-[42%] hidden md:block",
    delay: 0.55,
    content: (
      <div className="rounded-xl border border-primary/20 bg-primary-soft/80 px-3 py-2 shadow-md backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-primary">Pipeline → Qualified</span>
        </div>
      </div>
    ),
  },
];

export function HeroVisual() {
  return (
    <div className="relative mx-auto mt-14 max-w-[1000px] md:mt-16">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute -left-20 top-1/4 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-1/4 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />

      {floats.map((item, i) => (
        <motion.div
          key={item.id}
          className={`pointer-events-none absolute z-20 hidden sm:block ${item.className}`}
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4 + item.delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            animate={{ y: [0, i % 2 === 0 ? -10 : -7, 0] }}
            transition={{ duration: 4 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
          >
            {item.content}
          </motion.div>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 glow-pulse rounded-3xl"
      >
        <ProductShowcase />
      </motion.div>
    </div>
  );
}
