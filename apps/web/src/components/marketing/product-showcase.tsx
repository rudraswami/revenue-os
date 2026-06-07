"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  AnimatedDashboardShowcase,
  AnimatedInboxShowcase,
  AnimatedPipelineShowcase,
} from "./animated-showcases";

const views = [
  { id: "inbox", label: "Inbox" },
  { id: "pipeline", label: "Pipeline" },
  { id: "dashboard", label: "Dashboard" },
] as const;

type ViewId = (typeof views)[number]["id"];

const components: Record<ViewId, React.FC<{ paused?: boolean }>> = {
  inbox: AnimatedInboxShowcase,
  pipeline: AnimatedPipelineShowcase,
  dashboard: AnimatedDashboardShowcase,
};

export function ProductShowcase() {
  const [active, setActive] = useState<ViewId>("inbox");
  const [paused, setPaused] = useState(false);
  const View = components[active];

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setActive((current) => {
        const idx = views.findIndex((v) => v.id === current);
        return views[(idx + 1) % views.length].id;
      });
    }, 7000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div
      className="w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-6 flex justify-center gap-1">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => setActive(view.id)}
            className={cn(
              "relative px-5 py-2 text-[14px] font-medium transition-colors",
              active === view.id ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {view.label}
            {active === view.id && (
              <motion.span
                layoutId="product-tab"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
              />
            )}
          </button>
        ))}
      </div>

      <div className="product-frame-glow">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <View paused={paused && active !== "inbox"} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
