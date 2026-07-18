"use client";

import { motion } from "framer-motion";

const enter = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

export function AuthPageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div className="w-full" {...enter}>
      {children}
    </motion.div>
  );
}
