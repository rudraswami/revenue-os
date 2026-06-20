"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  AnimatedDashboardShowcase,
  AnimatedInboxShowcase,
  AnimatedPipelineShowcase,
} from "./animated-showcases";
import { IntelligenceMock } from "./mocks/product-mocks";

const views = [
  { id: "inbox", label: "Inbox" },
  { id: "intelligence", label: "Intelligence" },
  { id: "pipeline", label: "Pipeline" },
  { id: "dashboard", label: "Analytics" },
] as const;

type ViewId = (typeof views)[number]["id"];

function IntelligenceShowcase() {
  return <IntelligenceMock />;
}

const components: Record<ViewId, React.FC<{ paused?: boolean }>> = {
  inbox: AnimatedInboxShowcase,
  intelligence: IntelligenceShowcase,
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
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-white p-1 shadow-sm">
          {views.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => setActive(view.id)}
              className={cn(
                "relative rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all",
                active === view.id
                  ? "bg-[#25D366] text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {view.label}
            </button>
          ))}
        </div>
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
