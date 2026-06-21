"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function SectionHeader({
  label,
  title,
  subtitle,
  light = false,
  center = true,
}: {
  label?: string;
  title: ReactNode;
  subtitle?: string;
  light?: boolean;
  center?: boolean;
}) {
  return (
    <motion.div
      className={center ? "mx-auto max-w-[720px] text-center" : "max-w-[640px]"}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {label && (
        <p className={light ? "text-[#6cf8bb] section-label" : "section-label"}>{label}</p>
      )}
      <h2
        className={`display-lg mt-2 ${light ? "text-white" : "text-foreground"}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-[17px] leading-relaxed ${
            light ? "text-white/65" : "text-muted-foreground"
          }`}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
