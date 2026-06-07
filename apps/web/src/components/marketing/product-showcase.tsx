"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DashboardMock, InboxMock, PipelineMock } from "./mocks/product-mocks";

const views = [
  { id: "inbox", label: "Inbox" },
  { id: "pipeline", label: "Pipeline" },
  { id: "dashboard", label: "Dashboard" },
] as const;

type ViewId = (typeof views)[number]["id"];

const components: Record<ViewId, React.FC> = {
  inbox: InboxMock,
  pipeline: PipelineMock,
  dashboard: DashboardMock,
};

export function ProductShowcase() {
  const [active, setActive] = useState<ViewId>("inbox");
  const View = components[active];

  return (
    <div className="w-full">
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <View />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
