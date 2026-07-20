"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { measureInteraction, startInteraction } from "@/lib/performance";

/** P2 RUM — warm route transition timing (pathname → first paint). */
export function useRouteTransitionPerf() {
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (!pathname.startsWith("/dashboard")) return;

    const started = startInteraction();
    const from = prevPath.current;
    prevPath.current = pathname;

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        measureInteraction("dashboard.route_transition", started, {
          from,
          to: pathname,
        });
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname]);
}
