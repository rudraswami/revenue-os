"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, LineChart, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/marketing/logo";
import { HeroWhatsappPhone } from "@/components/marketing/illustrations/hero-whatsapp-phone";

const CYCLE_MS = 9000;

export function AuthBrandPanel() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="auth-brand-panel relative hidden flex-col justify-between overflow-hidden p-10 xl:p-12 lg:flex">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,rgb(0_108_73/0.35),transparent_55%)]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[#25D366]/10 blur-3xl" />

      <Logo variant="light" className="relative z-10" />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-8">
        <div className="relative w-full max-w-[320px]">
          <HeroWhatsappPhone tick={tick} />

          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="absolute -left-2 top-8 z-20 rounded-xl border border-white/10 bg-white/95 px-3 py-2.5 shadow-[0_12px_32px_rgb(0_0_0/0.25)] backdrop-blur-sm xl:-left-8"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bento-mint text-accent">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground">AI classified</p>
                <p className="text-xs font-bold text-foreground">Hot lead · 92 score</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="absolute -right-2 bottom-16 z-20 rounded-xl border border-white/10 bg-white/95 px-3 py-2.5 shadow-[0_12px_32px_rgb(0_0_0/0.25)] backdrop-blur-sm xl:-right-10"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bento-blue text-foreground">
                <LineChart className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[10px] font-medium text-muted-foreground">Pipeline</p>
                <p className="text-xs font-bold text-accent">Moved to Qualified</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 max-w-md">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-[#a8e6cf] backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" />
          AI Revenue Engine
        </div>
        <h2 className="text-2xl font-bold leading-tight tracking-tight text-white xl:text-[1.75rem]">
          Turn every WhatsApp chat into a closed deal.
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-white/70">
          One inbox, smart lead scoring, and a pipeline your team actually uses — on the number
          customers already message.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/60">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-light" />
            Meta-compliant
          </span>
          <span>Encrypted tokens</span>
          <span>14-day free trial</span>
        </div>
      </div>
    </div>
  );
}
