"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles, Zap } from "lucide-react";
import { HeroWhatsappPhone, useHeroAnimationCycle } from "./hero-whatsapp-phone";

function LivePill({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: delay < 0 ? -16 : 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.abs(delay), duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-[#dce9ff]/80 bg-white/90 p-3.5 shadow-[0_12px_40px_rgb(11_28_48/0.08)] backdrop-blur-sm sm:p-4"
    >
      {children}
    </motion.div>
  );
}

function AnimatedScore({ target, active }: { target: number; active: boolean }) {
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!active) {
      setScore(0);
      return;
    }
    let frame = 0;
    const steps = 18;
    const id = setInterval(() => {
      frame++;
      setScore(Math.min(target, Math.round((frame / steps) * target)));
      if (frame >= steps) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [active, target]);

  return <span className="font-bold tabular-nums text-accent">{score}</span>;
}

const PIPELINE = ["New", "Qualified", "Won"] as const;

/** Live, animated hero — proactive AI working while you watch */
export function HeroIllustration() {
  const tick = useHeroAnimationCycle();
  const [pipelineStage, setPipelineStage] = useState(0);
  const [showDeal, setShowDeal] = useState(false);
  const [aiActive, setAiActive] = useState(false);

  useEffect(() => {
    setPipelineStage(0);
    setShowDeal(false);
    setAiActive(false);

    const a = setTimeout(() => setAiActive(true), 3200);
    const p1 = setTimeout(() => setPipelineStage(1), 4000);
    const p2 = setTimeout(() => setPipelineStage(2), 4800);
    const p3 = setTimeout(() => setPipelineStage(3), 5600);
    const d = setTimeout(() => setShowDeal(true), 6200);

    return () => {
      clearTimeout(a);
      clearTimeout(p1);
      clearTimeout(p2);
      clearTimeout(p3);
      clearTimeout(d);
    };
  }, [tick]);

  return (
    <div className="relative mx-auto w-full max-w-[1000px]">
      {/* Live badge */}
      <motion.div
        className="mb-5 flex items-center justify-center gap-2 sm:mb-7"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="text-[12px] font-semibold text-accent sm:text-[13px]">
          Live — watch Growvisi work on a real lead
        </span>
      </motion.div>

      <div
        className="relative rounded-3xl border border-[#dce9ff] bg-gradient-to-b from-[#f8f9ff] to-white p-4 sm:p-6 md:p-8"
        style={{ minHeight: "clamp(440px, 72vw, 540px)" }}
      >
        {/* Animated flow lines */}
        <svg
          className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
          viewBox="0 0 1000 540"
          fill="none"
          aria-hidden
        >
          <motion.path
            d="M 220 270 H 360"
            stroke="#006c49"
            strokeWidth="2"
            strokeDasharray="8 6"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.35 }}
            transition={{ duration: 1.2, delay: 0.5, repeat: Infinity, repeatDelay: 7.5 }}
          />
          <motion.path
            d="M 640 270 H 780"
            stroke="#006c49"
            strokeWidth="2"
            strokeDasharray="8 6"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.35 }}
            transition={{ duration: 1.2, delay: 4, repeat: Infinity, repeatDelay: 7.5 }}
          />
          <motion.circle
            cx="290"
            cy="270"
            r="4"
            fill="#006c49"
            animate={{ cx: [220, 360], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, delay: 1, repeat: Infinity, repeatDelay: 7 }}
          />
          <motion.circle
            cx="710"
            cy="270"
            r="4"
            fill="#006c49"
            animate={{ cx: [640, 780], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, delay: 4.5, repeat: Infinity, repeatDelay: 7 }}
          />
        </svg>

        <div className="relative z-10 grid grid-cols-1 items-center gap-5 md:grid-cols-[1fr_auto_1fr] md:gap-4 lg:gap-6">
          {/* AI panel */}
          <div className="order-2 flex flex-col gap-3 md:order-1 md:items-end">
            <LivePill delay={-0.1}>
              <div className="flex items-start gap-2.5">
                <motion.div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ecfdf5] to-[#e5eeff]"
                  animate={aiActive ? { rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 0.6, repeat: aiActive ? Infinity : 0, repeatDelay: 2 }}
                >
                  <Sparkles className="h-4 w-4 text-accent" />
                </motion.div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground">Growvisi AI</p>
                  <p className="text-[14px] font-bold leading-snug">Reading intent…</p>
                  <AnimatePresence>
                    {aiActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2.5 space-y-1.5 overflow-hidden text-[11px]"
                      >
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Intent</span>
                          <motion.span
                            className="font-semibold text-accent"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            Buying
                          </motion.span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Budget</span>
                          <span className="font-semibold">₹85L</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Score</span>
                          <span>
                            <AnimatedScore target={92} active={aiActive} />
                            <span className="font-bold text-accent"> · Hot</span>
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </LivePill>

            <motion.div
              className="flex items-center gap-2 rounded-full border border-accent/20 bg-[#ecfdf5] px-3.5 py-2 md:ml-auto"
              animate={{ opacity: aiActive ? 1 : 0.4 }}
            >
              <Zap className="h-3.5 w-3.5 text-accent" />
              <span className="text-[11px] font-bold text-accent">Reply suggested in 2s</span>
            </motion.div>
          </div>

          {/* Phone */}
          <div className="order-1 flex justify-center py-2 md:order-2 md:py-0">
            <HeroWhatsappPhone tick={tick} />
          </div>

          {/* Pipeline + deal */}
          <div className="order-3 flex flex-col gap-3">
            <LivePill delay={0.1}>
              <p className="text-[11px] font-medium text-muted-foreground">Pipeline</p>
              <p className="text-[14px] font-bold">Priya Sharma</p>
              <div className="mt-3 flex items-center gap-1">
                {PIPELINE.map((stage, i) => {
                  const active = pipelineStage > i;
                  const current = pipelineStage === i + 1;
                  return (
                    <div key={stage} className="flex items-center gap-1">
                      <motion.span
                        className="rounded-lg px-2 py-1 text-[10px] font-semibold sm:text-[11px]"
                        animate={{
                          backgroundColor: active
                            ? stage === "Won"
                              ? "rgb(0 108 73)"
                              : "rgb(229 238 255)"
                            : "rgb(239 244 255)",
                          color: active
                            ? stage === "Won"
                              ? "#fff"
                              : "rgb(0 108 73)"
                            : "rgb(69 70 77)",
                          scale: current ? 1.06 : 1,
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        {stage}
                      </motion.span>
                      {i < PIPELINE.length - 1 && (
                        <motion.span
                          className="text-accent"
                          animate={{ opacity: pipelineStage > i ? 1 : 0.25 }}
                        >
                          →
                        </motion.span>
                      )}
                    </div>
                  );
                })}
              </div>
              <motion.p
                className="mt-2.5 text-[11px] text-muted-foreground"
                animate={{ opacity: pipelineStage >= 2 ? 1 : 0 }}
              >
                Auto-moved — no manual update needed
              </motion.p>
            </LivePill>

            <AnimatePresence>
              {showDeal && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  className="rounded-2xl border border-accent/30 bg-gradient-to-br from-[#ecfdf5] to-[#d3e4fe] p-3.5 sm:p-4"
                >
                  <motion.div
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex items-center gap-2.5"
                  >
                    <CheckCircle2 className="h-6 w-6 text-accent" strokeWidth={2.5} />
                    <div>
                      <p className="text-[11px] font-semibold text-accent">Deal closed</p>
                      <p className="text-[16px] font-bold text-foreground">₹85L booking 🎉</p>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
