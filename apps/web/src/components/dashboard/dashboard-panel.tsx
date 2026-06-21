"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function DashboardPanel({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  noPadding,
  delay = 0,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      className={cn(
        "overflow-hidden rounded-2xl border border-[#dce9ff] bg-white shadow-[0_4px_20px_rgb(11_28_48/0.05)]",
        className,
      )}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dce9ff]/80 bg-[#f8f9ff]/60 px-5 py-4">
          <div>
            {title && <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>}
            {description && (
              <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn(!noPadding && "p-5", contentClassName)}>{children}</div>
    </motion.div>
  );
}
