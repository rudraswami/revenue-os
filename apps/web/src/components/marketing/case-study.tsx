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
import { Button } from "@/components/ui/button";
import { useLiveCycle } from "@/hooks/use-live-cycle";
import { usePauseHover } from "@/hooks/use-pause-hover";
import { CTA, HOME_PILOT, PILOT_ROLLOUT } from "@/lib/brand-copy";
import { PILOT_METRICS_TEMPLATE } from "@/lib/marketing-nav";
import { cn } from "@/lib/utils";
import { LiveCycleBar } from "./live-cycle-bar";
import { SectionHeader } from "./section-header";

const EASE = [0.22, 1, 0.36, 1] as const;
const CYCLE_MS = 4800;

export function CaseStudy() {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.2, margin: "-40px 0px" });
  const [active, setActive] = useState(0);
  const { paused, pauseProps } = usePauseHover();
  const { cycleKey, progress, reset } = useLiveCycle({
    enabled: inView && !reduce,
    durationMs: CYCLE_MS,
    paused,
    onAdvance: () => setActive((i) => (i + 1) % PILOT_ROLLOUT.length),
  });

  const step = PILOT_ROLLOUT[active]!;
  const metricsLive = step.id === "w4";

  return (
    <section id="case-study" className="pilot-section relative scroll-mt-20 overflow-hidden py-20 md:py-28">
      <div className="pilot-section-bg" aria-hidden />

      <div className="relative mx-auto max-w-[76rem] px-6 lg:px-8">
        <SectionHeader
          label={HOME_PILOT.label}
          title={HOME_PILOT.title}
          subtitle={HOME_PILOT.subtitle}
        />

        <div ref={rootRef} className="pilot-canvas mx-auto mt-14 max-w-[56rem]">
          <div className="pilot-canvas-shell" {...pauseProps}>
            <div className="pilot-canvas-head">
              <div>
                <p className="pilot-canvas-kicker">{HOME_PILOT.rolloutTitle}</p>
                <p className="pilot-canvas-headline">Your first 30 days on Growvisi</p>
              </div>
              <span className="pilot-cohort-badge">{HOME_PILOT.cohortBadge}</span>
            </div>

            <div className="pilot-steps" role="tablist" aria-label="Pilot rollout weeks">
              {PILOT_ROLLOUT.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  onClick={() => {
                    setActive(i);
                    reset();
                  }}
                  className={cn("pilot-step-tab", i === active && "pilot-step-tab-active")}
                >
                  <span className="pilot-step-week">{item.week}</span>
                  <span className="pilot-step-title">{item.title}</span>
                  {i === active && inView ? (
                    <LiveCycleBar progress={progress} className="pilot-step-progress" />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="pilot-detail">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${step.id}-${cycleKey}`}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="pilot-detail-inner"
                >
                  <span className="pilot-signal-pill">{step.signal}</span>
                  <p className="pilot-detail-text">{step.detail}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className={cn("pilot-metrics", metricsLive && "pilot-metrics-live")}>
              <p className="pilot-metrics-label">{HOME_PILOT.metricsNote}</p>
              <div className="pilot-metrics-grid">
                {PILOT_METRICS_TEMPLATE.map((m) => (
                  <div key={m.key} className="pilot-metric-cell">
                    <p className="pilot-metric-name">{m.label}</p>
                    <p className="pilot-metric-value" aria-label="Pending pilot data">
                      —
                    </p>
                    <p className="pilot-metric-note">{m.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pilot-cta">
              <p className="pilot-cta-copy">{HOME_PILOT.ctaBody}</p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="h-11 px-6">
                  <Link href="/register">
                    {CTA.startTrial}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Link
                  href="/contact#inquiry"
                  className="inline-flex h-11 items-center rounded-md border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {CTA.bookDemo}
                </Link>
              </div>
            </div>
          </div>

          <p className="pilot-icp">{HOME_PILOT.icp}</p>
        </div>
      </div>
    </section>
  );
}
