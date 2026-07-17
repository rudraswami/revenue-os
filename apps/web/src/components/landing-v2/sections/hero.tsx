"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CTA, HOME_HERO } from "@/lib/brand-copy";
import { HeroHandoff } from "../hero-handoff";

const EASE = [0.22, 1, 0.36, 1] as const;

function Fade({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function HeroHeadline() {
  const accent = HOME_HERO.headlineAccent;
  const headline = HOME_HERO.headline;
  const accentIndex = headline.indexOf(accent);

  if (accentIndex === -1) {
    return <>{headline}</>;
  }

  return (
    <>
      {headline.slice(0, accentIndex)}
      <span className="text-accent">{accent}</span>
      {headline.slice(accentIndex + accent.length)}
    </>
  );
}

export function LandingV2Hero() {
  return (
    <section
      id="hero"
      className="hero-v2-section relative overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <div className="hero-v2-bg" aria-hidden>
        <div className="hero-v2-bg-glow hero-v2-bg-glow-a" />
        <div className="hero-v2-bg-glow hero-v2-bg-glow-b" />
      </div>

      <div className="relative mx-auto max-w-[76rem] px-6 pt-12 pb-20 lg:px-8 lg:pt-16 lg:pb-28">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14 xl:gap-20">
          <div className="hero-v2-copy lg:sticky lg:top-28 lg:pt-2">
            <Fade delay={0.04}>
              <p className="hero-v2-label m-0">{HOME_HERO.label}</p>
            </Fade>

            <Fade delay={0.1}>
              <h1 id="hero-heading" className="hero-v2-headline mt-3">
                <HeroHeadline />
              </h1>
            </Fade>

            <Fade delay={0.17}>
              <p className="hero-v2-subhead mt-4">{HOME_HERO.subhead}</p>
            </Fade>

            <Fade delay={0.24}>
              <p className="hero-v2-body mt-3">{HOME_HERO.body}</p>
            </Fade>

            <Fade delay={0.31}>
              <p className="hero-v2-proof mt-6">{HOME_HERO.proof}</p>
            </Fade>

            <Fade delay={0.38} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" className="h-12 px-8 text-[15px] font-semibold" asChild>
                <Link href="/register">{CTA.startTrial}</Link>
              </Button>
              <p className="hero-v2-trial-note m-0">{HOME_HERO.trialNote}</p>
            </Fade>
          </div>

          <div className="hero-handoff-anchor min-w-0">
            <HeroHandoff />
          </div>
        </div>
      </div>
    </section>
  );
}
