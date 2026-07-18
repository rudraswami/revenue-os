"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { SectionHeader } from "./section-header";
import { LiveCycleBar } from "./live-cycle-bar";
import { HOME_LAYER } from "@/lib/brand-copy";
import { LAYER_FILM_COPY, LAYER_FILM_MS } from "@/lib/landing-v2/layer-film";
import { useFilmProgress } from "@/hooks/use-live-cycle";
import { usePauseHover } from "@/hooks/use-pause-hover";
import { cn } from "@/lib/utils";

type Phase = "message" | "sync" | "understand" | "assign" | "pipeline" | "hold";

const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 380, damping: 30 };
const T = LAYER_FILM_MS;
const { customer, classify, assign, deal } = LAYER_FILM_COPY;

const STEPS = [
  { key: "message", label: "Message lands" },
  { key: "understand", label: "Intent read" },
  { key: "pipeline", label: "Deal tracked" },
] as const;

export function HowItWorksLayer() {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.2, margin: "-40px 0px" });
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>(reduce ? "hold" : "message");
  const { paused, pauseProps } = usePauseHover();
  const filmProgress = useFilmProgress({
    enabled: inView && !reduce,
    durationMs: T.loop,
    runKey: run,
    paused,
  });

  // Kick film when section is already in view (e.g. #engine hash navigation)
  useEffect(() => {
    if (reduce) return;
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      setRun((n) => n + 1);
    }
  }, [reduce]);

  useEffect(() => {
    if (reduce) {
      setPhase("hold");
      return;
    }
    if (!inView) return;

    setPhase("message");
    const timers = [
      window.setTimeout(() => setPhase("sync"), T.sync),
      window.setTimeout(() => setPhase("understand"), T.understand),
      window.setTimeout(() => setPhase("assign"), T.assign),
      window.setTimeout(() => setPhase("pipeline"), T.pipeline),
      window.setTimeout(() => setPhase("hold"), T.hold),
      window.setTimeout(() => setRun((n) => n + 1), T.loop),
    ];
    return () => timers.forEach(clearTimeout);
  }, [inView, reduce, run]);

  const showSync = phase !== "message";
  const showUnderstand = ["understand", "assign", "pipeline", "hold"].includes(phase);
  const showAssign = ["assign", "pipeline", "hold"].includes(phase);
  const showPipeline = ["pipeline", "hold"].includes(phase);
  const activeStep = showPipeline ? 2 : showUnderstand ? 1 : 0;

  return (
    <section
      id="engine"
      className="layer-section relative scroll-mt-20 overflow-hidden py-20 md:py-28"
    >
      <div className="layer-section-bg" aria-hidden />

      <div className="relative mx-auto max-w-[76rem] px-6 lg:px-8">
        <SectionHeader
          label={HOME_LAYER.label}
          title={HOME_LAYER.title}
          subtitle={HOME_LAYER.subtitle}
        />

        <div ref={rootRef} className="layer-canvas mx-auto mt-14 max-w-[56rem]">
          {/* Unified shell — one premium surface */}
          <div className="layer-canvas-shell" {...pauseProps}>
            <div className="layer-canvas-top">
              <div className="flex items-center gap-2.5">
                <span className="layer-live-dot" aria-hidden />
                <span className="text-[13px] font-semibold text-foreground">
                  {customer.name}
                </span>
                <span className="text-[12px] text-muted-foreground">·</span>
                <span className="text-[12px] text-muted-foreground">
                  {customer.context}
                </span>
              </div>
              <AnimatePresence mode="wait">
                {showAssign ? (
                  <motion.span
                    key="turn"
                    initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={SPRING}
                    className="layer-turn-pill"
                  >
                    {assign.label} · {assign.name}
                  </motion.span>
                ) : showUnderstand ? (
                  <motion.span
                    key="read"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="layer-sync-pill"
                  >
                    Understood
                  </motion.span>
                ) : (
                  <motion.span key="live" className="layer-sync-pill">
                    Live on WhatsApp
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="layer-canvas-grid">
              {/* WhatsApp side */}
              <div className="layer-col layer-col-wa">
                <p className="layer-col-label">WhatsApp</p>
                <motion.div
                  className="layer-wa-bubble"
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <p className="m-0 text-[15px] leading-relaxed text-foreground">
                    {customer.message}
                  </p>
                  <p className="mt-2 m-0 text-[10px] text-muted-foreground">Just now</p>
                </motion.div>
              </div>

              {/* Connector */}
              <div className="layer-connector" aria-hidden>
                <div className={cn("layer-connector-line", showSync && "is-live")} />
                <AnimatePresence>
                  {showSync ? (
                    <motion.span
                      key="arrow"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="layer-connector-badge"
                    >
                      →
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* Growvisi side — fixed height content slot */}
              <div className="layer-col layer-col-gv">
                <p className="layer-col-label layer-col-label-light">Growvisi pipeline</p>

                <div className="layer-gv-slot">
                  <AnimatePresence mode="wait">
                    {!showPipeline ? (
                      <motion.div
                        key="states"
                        className="layer-gv-states"
                        initial={false}
                        exit={{ opacity: 0 }}
                      >
                        <AnimatePresence>
                          {showUnderstand ? (
                            <motion.p
                              key="c"
                              initial={reduce ? false : { opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="layer-gv-line"
                            >
                              <span className="layer-gv-dot" />
                              {classify}
                            </motion.p>
                          ) : (
                            <motion.p
                              key="w"
                              className="layer-gv-muted"
                              animate={reduce ? undefined : { opacity: [0.5, 0.85, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              Reading message…
                            </motion.p>
                          )}
                        </AnimatePresence>

                        {showAssign ? (
                          <motion.p
                            initial={reduce ? false : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="layer-gv-line mt-3"
                          >
                            <span className="layer-gv-dot layer-gv-dot-orange" />
                            Assigned to {assign.name}
                          </motion.p>
                        ) : null}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="deal"
                        initial={reduce ? false : { opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={SPRING}
                        className="layer-deal"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="m-0 text-[15px] font-bold text-white">
                              {deal.title}
                            </p>
                            <p className="mt-0.5 m-0 text-[11px] text-white/50">
                              {deal.subtitle}
                            </p>
                          </div>
                          <span className="layer-deal-score">{deal.score}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="layer-deal-stage">{deal.stage}</span>
                          <span className="layer-deal-value">{deal.value}</span>
                        </div>
                        <div className="layer-deal-bar mt-3">
                          <motion.div
                            className="layer-deal-bar-fill"
                            initial={reduce ? false : { width: "0%" }}
                            animate={{ width: "72%" }}
                            transition={{ duration: 0.65, ease: EASE }}
                          />
                        </div>
                        <p className="mt-2.5 m-0 text-[11px] font-medium text-[#6cf8bb]">
                          Tracked on pipeline
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Progress rail */}
            <div className="layer-progress-wrap">
              <div className="layer-progress">
                {STEPS.map((step, i) => (
                  <div
                    key={step.key}
                    className={cn(
                      "layer-progress-step",
                      i <= activeStep && "is-on",
                      i === activeStep && "is-active",
                    )}
                  >
                    <span className="layer-progress-n">0{i + 1}</span>
                    <span className="layer-progress-label">{step.label}</span>
                  </div>
                ))}
              </div>
              <LiveCycleBar progress={filmProgress} className="layer-film-progress" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
