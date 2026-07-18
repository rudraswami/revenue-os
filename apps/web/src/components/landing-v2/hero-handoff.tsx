"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { Check, MessageCircle, ShieldCheck } from "lucide-react";
import { CONVERSATIONS } from "@/lib/brand-copy";
import {
  HERO_HANDOFF_COPY,
  HERO_HANDOFF_MS,
} from "@/lib/landing-v2/hero-film";
import { useFilmProgress } from "@/hooks/use-live-cycle";
import { usePauseHover } from "@/hooks/use-pause-hover";
import { LiveCycleBar } from "@/components/marketing/live-cycle-bar";
import { cn } from "@/lib/utils";

type Phase =
  | "message"
  | "scan"
  | "understand"
  | "stop"
  | "yourTurn"
  | "reply"
  | "hold";

const EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 380, damping: 28 };

const { customer, ghostReply, human } = HERO_HANDOFF_COPY;
const T = HERO_HANDOFF_MS;

export function HeroHandoff({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.35, once: false });
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>(reduce ? "hold" : "message");
  const [typed, setTyped] = useState(reduce ? human.reply : "");
  const [hasLooped, setHasLooped] = useState(false);
  const { paused, pauseProps } = usePauseHover();
  const filmProgress = useFilmProgress({
    enabled: inView && !reduce,
    durationMs: T.loop,
    runKey: run,
    paused,
  });

  useEffect(() => {
    if (!inView || reduce) {
      if (reduce) setPhase("hold");
      return;
    }
    setPhase("message");
    setTyped("");
    const timers = [
      window.setTimeout(() => setPhase("scan"), T.scan),
      window.setTimeout(() => setPhase("understand"), T.understand),
      window.setTimeout(() => setPhase("stop"), T.stop),
      window.setTimeout(() => setPhase("yourTurn"), T.yourTurn),
      window.setTimeout(() => setPhase("reply"), T.reply),
      window.setTimeout(() => setPhase("hold"), T.hold),
      window.setTimeout(() => {
        setHasLooped(true);
        setRun((n) => n + 1);
      }, T.loop),
    ];
    return () => timers.forEach(clearTimeout);
  }, [inView, reduce, run]);

  useEffect(() => {
    if (phase !== "reply" || reduce) return;
    setTyped("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(human.reply.slice(0, i));
      if (i >= human.reply.length) window.clearInterval(id);
    }, 20);
    return () => window.clearInterval(id);
  }, [phase, reduce, run]);

  const showScan = ["scan", "understand", "stop", "yourTurn", "reply", "hold"].includes(
    phase,
  );
  const showUnderstand = ["understand", "stop", "yourTurn", "reply", "hold"].includes(
    phase,
  );
  const showStop = ["stop", "yourTurn", "reply", "hold"].includes(phase);
  const showYourTurn = ["yourTurn", "reply", "hold"].includes(phase);
  const showReply = ["reply", "hold"].includes(phase);
  const isTurnPeak = phase === "yourTurn";
  const isResolved = phase === "hold";

  return (
    <div
      ref={rootRef}
      className={cn("hero-handoff-root relative mx-auto w-full max-w-[34rem]", className)}
      aria-label="WhatsApp handoff: AI understands, human replies"
      {...pauseProps}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isTurnPeak
          ? "Your turn. Meera should reply."
          : showReply && isResolved
            ? "Meera sent a human reply."
            : showStop
              ? "Auto-reply blocked. Waiting for a human."
              : showUnderstand
                ? "Quote request understood."
                : "New WhatsApp message from customer."}
      </div>
      {/* Ambient field */}
      <div className="hero-handoff-ambient" aria-hidden>
        <div className="hero-handoff-orb hero-handoff-orb-a" />
        <div className="hero-handoff-orb hero-handoff-orb-b" />
        <div className="hero-handoff-orb hero-handoff-orb-c" />
      </div>

      <motion.div
        className={cn(
          "hero-handoff-stage relative overflow-hidden rounded-[1.75rem] border bg-white/80 backdrop-blur-sm",
          showYourTurn ? "hero-handoff-stage-turn" : "border-[#dce9ff]",
          isTurnPeak && "hero-handoff-stage-peak",
        )}
        initial={reduce ? false : { opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        {/* Thread header */}
        <div className="relative z-10 flex items-center justify-between gap-3 border-b border-[#e8f0ff] px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ecfdf5] text-[#128C7E]">
              <MessageCircle className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="m-0 truncate text-[15px] font-semibold text-foreground">
                {customer.name}
              </p>
              <p className="mt-0.5 m-0 text-[12px] text-muted-foreground">
                {customer.context}
              </p>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {showYourTurn ? (
              <motion.div
                key="badge"
                initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={SPRING}
                className={cn("hero-handoff-badge", isResolved && "hero-handoff-badge-settled")}
              >
                {CONVERSATIONS.yourTurn}
              </motion.div>
            ) : (
              <motion.span
                key="live"
                className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                <span className="hero-handoff-pulse" />
                Live
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Conversation body */}
        <div className="hero-handoff-mid relative z-10 flex flex-1 flex-col px-6 pt-6 pb-2">
          <div className="relative shrink-0">
            <AnimatePresence>
              {showScan && !reduce ? (
                <motion.div
                  key="scan"
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl rounded-bl-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="hero-handoff-scanline"
                    initial={{ y: "-120%" }}
                    animate={{ y: "220%" }}
                    transition={{ duration: 0.9, ease: EASE }}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.div
              className="hero-handoff-bubble relative max-w-[94%] rounded-2xl rounded-bl-md bg-[#f4f6f8] px-4 py-3.5 ring-1 ring-[#e2e8f0]"
              initial={reduce ? false : { opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <p className="m-0 text-[15px] leading-[1.55] text-foreground">
                {customer.message}
              </p>
              <p className="mt-2 m-0 text-[11px] text-muted-foreground">Just now</p>
            </motion.div>
          </div>

          {/* AI layer — fixed slot so height never shifts */}
          <div className="hero-handoff-ai mt-5 flex-1">
            <AnimatePresence mode="wait">
              {showUnderstand && !isTurnPeak ? (
                <motion.div
                  key="ai"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="space-y-3"
                >
                  <p className="m-0 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <motion.span
                      initial={reduce ? false : { scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={SPRING}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#ecfdf5] text-accent"
                    >
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </motion.span>
                    <span className="font-semibold text-foreground">
                      Quote request
                    </span>
                    {" · "}
                    understood
                  </p>

                  {showStop ? (
                    <motion.div
                      initial={reduce ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2"
                    >
                      <div className="rounded-xl border border-dashed border-[#fed7aa] bg-[#fffbeb] px-3 py-2.5">
                        <motion.p
                          className="m-0 text-[12px] leading-relaxed text-[#9a3412]/70"
                          initial={reduce ? false : { opacity: 0.85 }}
                          animate={{ opacity: 0.55 }}
                          transition={{ delay: 0.2, duration: 0.35 }}
                          style={{
                            textDecoration: "line-through",
                            textDecorationColor: "rgb(194 65 12 / 0.45)",
                          }}
                        >
                          {ghostReply}
                        </motion.p>
                        <p className="mt-1.5 m-0 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#c2410c]">
                          <ShieldCheck className="h-3 w-3" aria-hidden />
                          Auto-reply blocked
                        </p>
                      </div>
                      <p className="m-0 text-[13px] font-medium text-foreground">
                        Waiting for {human.name}…
                      </p>
                    </motion.div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* YOUR TURN — signature overlay */}
        <AnimatePresence>
          {isTurnPeak ? (
            <motion.div
              key="turn-overlay"
              className="hero-handoff-turn-overlay absolute inset-0 z-20 flex flex-col items-center justify-center px-8 text-center"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <motion.p
                className="hero-handoff-turn-type m-0"
                initial={reduce ? false : { opacity: 0, scale: 0.82, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={SPRING}
              >
                {CONVERSATIONS.yourTurn}
              </motion.p>
              <motion.p
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4, ease: EASE }}
                className="mt-4 m-0 max-w-[16rem] text-[14px] leading-relaxed text-[#9a3412]/90"
              >
                {human.name} — reply from Inbox or WhatsApp. Never a bot.
              </motion.p>
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25, ...SPRING }}
                className="mt-5 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 shadow-sm ring-1 ring-[#fed7aa]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff7ed] text-[13px] font-bold text-[#c2410c]">
                  M
                </span>
                <span className="text-[13px] font-semibold text-foreground">
                  Assigned to {human.name}
                </span>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Compose / reply */}
        <div className="hero-handoff-compose relative z-10 shrink-0 border-t border-[#e8f0ff] bg-[#fafbfc] px-6 py-5">
          <AnimatePresence mode="wait">
            {showReply ? (
              <motion.div
                key="reply"
                initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <div
                  className={cn(
                    "ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-foreground px-4 py-3.5 text-white shadow-[0_12px_32px_rgb(11_28_48/0.14)]",
                    isResolved && "hero-handoff-reply-resolved",
                  )}
                >
                  <p className="m-0 min-h-[2.5rem] text-[14px] leading-relaxed">
                    {typed}
                    {phase === "reply" && typed.length < human.reply.length ? (
                      <span className="hero-handoff-caret" aria-hidden />
                    ) : null}
                  </p>
                  <p className="mt-2 m-0 flex items-center gap-1.5 text-[11px] text-white/50">
                    {isResolved ? (
                      <Check className="h-3 w-3 text-[#6cf8bb]" aria-hidden />
                    ) : null}
                    {human.name} · human reply
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="compose"
                animate={{ opacity: showYourTurn && !isTurnPeak ? 0.4 : 1 }}
              >
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3.5 text-[14px] transition-colors duration-300",
                    showStop
                      ? "border-[#fed7aa] bg-[#fffbeb] text-[#9a3412]"
                      : "border-[#dce9ff] bg-white text-[#94a3b8]",
                  )}
                >
                  {showStop
                    ? `Waiting for ${human.name}…`
                    : "Write your WhatsApp reply…"}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <LiveCycleBar progress={filmProgress} className="hero-handoff-film-progress" />
      </motion.div>

      {!reduce && hasLooped ? (
        <button
          type="button"
          onClick={() => setRun((n) => n + 1)}
          className="relative z-10 mt-4 w-full text-center text-[11px] text-muted-foreground/70 transition-colors hover:text-muted-foreground"
        >
          Watch again
        </button>
      ) : null}
    </div>
  );
}
