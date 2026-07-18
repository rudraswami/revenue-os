"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useLiveCycle } from "@/hooks/use-live-cycle";
import { usePauseHover } from "@/hooks/use-pause-hover";
import { HOME_INDUSTRIES, INDUSTRY_STORIES } from "@/lib/brand-copy";
import { cn } from "@/lib/utils";
import { LiveCycleBar } from "./live-cycle-bar";
import { SectionHeader } from "./section-header";

const EASE = [0.22, 1, 0.36, 1] as const;
const CYCLE_MS = 5200;

export function IndustryUseCases() {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.25, margin: "-40px 0px" });
  const [active, setActive] = useState(0);
  const { paused, pauseProps } = usePauseHover();
  const { cycleKey, progress, reset } = useLiveCycle({
    enabled: inView && !reduce,
    durationMs: CYCLE_MS,
    paused,
    onAdvance: () =>
      setActive((i) => (i + 1) % INDUSTRY_STORIES.length),
  });

  const story = INDUSTRY_STORIES[active]!;

  return (
    <section
      id="industries"
      className="industries-section relative scroll-mt-20 overflow-hidden py-20 md:py-28"
    >
      <div className="industries-section-bg" aria-hidden />

      <div className="relative mx-auto max-w-[76rem] px-6 lg:px-8">
        <SectionHeader
          label={HOME_INDUSTRIES.label}
          title={HOME_INDUSTRIES.title}
          subtitle={HOME_INDUSTRIES.subtitle}
        />

        <div
          ref={rootRef}
          className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]"
        >
          {/* Selector — typography, no icon orbit */}
          <div className="industries-list flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {INDUSTRY_STORIES.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActive(i);
                  reset();
                }}
                className={cn(
                  "industries-tab shrink-0 text-left",
                  i === active && "industries-tab-active",
                )}
              >
                <span className="industries-tab-n">0{i + 1}</span>
                <span className="industries-tab-title">{item.title}</span>
                {i === active && inView ? (
                  <LiveCycleBar
                    progress={progress}
                    className="industries-tab-progress"
                  />
                ) : null}
              </button>
            ))}
          </div>

          {/* Live preview — same grammar as How it works */}
          <div className="layer-canvas-shell min-w-0" {...pauseProps}>
            <div className="layer-canvas-top">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="layer-live-dot" aria-hidden />
                <span className="text-[13px] font-semibold text-foreground">
                  {story.title}
                </span>
                <span className="text-[12px] text-muted-foreground">·</span>
                <span className="text-[12px] text-muted-foreground">
                  {story.context}
                </span>
              </div>
              <span className="layer-sync-pill shrink-0">Live example</span>
            </div>

            <div className="layer-canvas-grid">
              <div className="layer-col layer-col-wa">
                <p className="layer-col-label">WhatsApp</p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${story.id}-msg-${cycleKey}`}
                    className="layer-wa-bubble"
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <p className="m-0 text-[15px] leading-relaxed text-foreground">
                      {story.message}
                    </p>
                    <p className="mt-2 m-0 text-[10px] text-muted-foreground">
                      Just now
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="layer-connector" aria-hidden>
                <div className="layer-connector-line is-live" />
                <span className="layer-connector-badge">→</span>
              </div>

              <div className="layer-col layer-col-gv">
                <p className="layer-col-label layer-col-label-light">Growvisi</p>
                <div className="layer-gv-slot">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${story.id}-deal-${cycleKey}`}
                      initial={reduce ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="layer-deal w-full"
                    >
                      <p className="layer-gv-line m-0">
                        <span className="layer-gv-dot" />
                        {story.classify}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="layer-deal-stage">{story.outcome}</span>
                        <span className="layer-deal-value">{story.value}</span>
                      </div>
                      <div className="layer-deal-bar mt-3">
                        <motion.div
                          className="layer-deal-bar-fill"
                          initial={reduce ? false : { width: "0%" }}
                          animate={{ width: "76%" }}
                          transition={{ duration: 0.55, ease: EASE }}
                        />
                      </div>
                      <p className="mt-2.5 m-0 text-[11px] font-medium text-[#6cf8bb]">
                        Tracked on pipeline
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {"href" in story && story.href ? (
              <div className="border-t border-[var(--color-border)] bg-[#fafbff] px-5 py-3.5">
                <Link
                  href={story.href}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline"
                >
                  Explore {story.title.toLowerCase()}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
