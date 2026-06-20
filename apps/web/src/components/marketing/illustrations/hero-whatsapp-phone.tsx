"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MESSAGES = [
  { id: 1, side: "in" as const, text: "Hi! Any 2BHK in Whitefield around ₹85L?" },
  { id: 2, side: "out" as const, text: "Yes Priya — 2 options available. Site visit Saturday?" },
  { id: 3, side: "in" as const, text: "Saturday works 👍" },
];

const CYCLE_MS = 9000;

/** Animated WhatsApp phone — messages appear live, AI reacts proactively */
export function HeroWhatsappPhone({ tick }: { tick: number }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const [showAi, setShowAi] = useState(false);

  useEffect(() => {
    setVisibleCount(0);
    setShowTyping(false);
    setShowAi(false);

    const t1 = setTimeout(() => setVisibleCount(1), 400);
    const t2 = setTimeout(() => {
      setShowTyping(true);
      setTimeout(() => {
        setShowTyping(false);
        setVisibleCount(2);
      }, 700);
    }, 1400);
    const t3 = setTimeout(() => setVisibleCount(3), 2600);
    const t4 = setTimeout(() => setShowAi(true), 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [tick]);

  return (
    <motion.div
      className="relative mx-auto w-[210px] sm:w-[232px] md:w-[256px]"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Glow ring */}
      <motion.div
        className="absolute -inset-4 rounded-[2.5rem] bg-[radial-gradient(circle,rgb(0_108_73/0.15),transparent_70%)]"
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.98, 1.02, 0.98] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative rounded-[2rem] border-[3px] border-[#0b1c30] bg-[#0b1c30] p-1.5 shadow-[0_28px_64px_rgb(11_28_48/0.22)] sm:rounded-[2.25rem] sm:p-2">
        <div className="overflow-hidden rounded-[1.5rem] bg-[#ece5dd] sm:rounded-[1.65rem]">
          <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-[11px] font-bold text-white">
              PS
              <motion.span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#075e54] bg-[#25D366]"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-white">Priya Sharma</p>
              <p className="text-[10px] text-[#a8e6cf]">typing…</p>
            </div>
          </div>

          <div className="min-h-[148px] space-y-2 px-2.5 py-3 sm:min-h-[160px]">
            <AnimatePresence mode="popLayout">
              {MESSAGES.slice(0, visibleCount).map((msg) => (
                <motion.div
                  key={`${tick}-${msg.id}`}
                  initial={{ opacity: 0, y: 10, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className={
                    msg.side === "in"
                      ? "ml-auto max-w-[92%] rounded-lg rounded-tr-sm bg-[#d9fdd3] px-2.5 py-2 text-[10px] leading-snug text-[#111] shadow-sm sm:text-[11px]"
                      : "max-w-[92%] rounded-lg rounded-tl-sm bg-white px-2.5 py-2 text-[10px] leading-snug shadow-sm sm:text-[11px]"
                  }
                >
                  {msg.text}
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {showTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex max-w-[52px] gap-1 rounded-lg rounded-tl-sm bg-white px-3 py-2.5 shadow-sm"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-[#90a4ae]"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showAi && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="border-t border-[#075e54]/10 bg-white px-2.5 py-2"
              >
                <motion.div
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#ecfdf5] to-[#e5eeff] px-2 py-1.5"
                  animate={{ boxShadow: ["0 0 0 0 rgb(0 108 73 / 0)", "0 0 0 4px rgb(0 108 73 / 0.12)", "0 0 0 0 rgb(0 108 73 / 0)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <motion.span
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-white"
                    animate={{ rotate: [0, 8, -8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  >
                    G
                  </motion.span>
                  <p className="text-[9px] font-semibold text-accent sm:text-[10px]">
                    Buying intent · Score 92 · Hot lead
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="absolute left-1/2 top-2 h-1 w-12 -translate-x-1/2 rounded-full bg-[#0b1c30]/80" />

      {/* Incoming ping */}
      <AnimatePresence>
        {visibleCount === 1 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -right-1 top-8 flex h-5 w-5 items-center justify-center rounded-full bg-[#25D366] text-[9px] font-bold text-white shadow-lg"
          >
            1
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function useHeroAnimationCycle() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), CYCLE_MS);
    return () => clearInterval(id);
  }, []);
  return tick;
}
