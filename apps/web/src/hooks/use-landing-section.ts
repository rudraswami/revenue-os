"use client";

import { useEffect, useState } from "react";

/** Section ids on the homepage — order matches scroll position. */
export const LANDING_SECTION_IDS = [
  "hero",
  "problem",
  "engine",
  "industries",
  "case-study",
  "revenue-impact",
  "pricing",
  "meta-compare",
  "compare",
  "product",
  "trust",
  "faq",
  "cta",
] as const;

export type LandingSectionId = (typeof LANDING_SECTION_IDS)[number];

/** Tracks which homepage section is most visible while scrolling. */
export function useLandingSection(enabled: boolean): LandingSectionId | null {
  const [active, setActive] = useState<LandingSectionId | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const elements = LANDING_SECTION_IDS.map((id) => document.getElementById(id)).filter(
      Boolean,
    ) as HTMLElement[];

    if (elements.length === 0) return;

    const ratios = new Map<string, number>();

    const pickActive = () => {
      let bestId: LandingSectionId | null = null;
      let bestRatio = 0;
      for (const id of LANDING_SECTION_IDS) {
        const ratio = ratios.get(id) ?? 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      }
      if (!bestId && elements[0]) {
        bestId = elements[0].id as LandingSectionId;
      }
      setActive(bestId);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.intersectionRatio);
        }
        pickActive();
      },
      { threshold: [0, 0.15, 0.35, 0.55, 0.75] },
    );

    for (const el of elements) observer.observe(el);
    pickActive();

    return () => observer.disconnect();
  }, [enabled]);

  return active;
}
