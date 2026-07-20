"use client";

import { motion } from "framer-motion";
import { MOTION, usePrefersReducedMotion } from "@/lib/motion";

/**
 * Route transition for the dashboard. A `template` remounts on every
 * navigation, so content crossfades in instead of hard-cutting — a subtle
 * signal of "intentional" movement. Respects prefers-reduced-motion.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      className="flex min-h-0 w-full flex-1 flex-col"
      initial={reduced ? false : { opacity: 0 }}
      animate={reduced ? {} : { opacity: 1 }}
      transition={{ duration: MOTION.duration.base, ease: MOTION.ease }}
    >
      {children}
    </motion.div>
  );
}
