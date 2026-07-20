import { captureSentryClientException } from "@/lib/sentry";

const RUM_BUDGETS_MS: Record<string, number> = {
  lcp: 2500,
  inp: 200,
  cls: 0.1,
  "dashboard.interactive": 2000,
};

let observersStarted = false;

function reportMetric(name: string, value: number, unit: "millisecond" | "none" = "millisecond") {
  if (typeof window === "undefined") return;

  const budget = RUM_BUDGETS_MS[name];
  if (process.env.NODE_ENV === "development") {
    const over = budget != null && value > budget ? " (over budget)" : "";
    console.debug(`[rum] ${name}: ${value}${unit === "none" ? "" : "ms"}${over}`);
  }

  if (budget != null && value > budget * 1.5) {
    captureSentryClientException(
      new Error(`RUM budget exceeded: ${name}=${value}${unit === "millisecond" ? "ms" : ""}`),
    );
  }
}

/** Core Web Vitals + dashboard interactive — P2 RUM (§7.1). */
export function initWebVitalsObservers(): void {
  if (typeof window === "undefined" || observersStarted) return;
  observersStarted = true;

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      if (last) reportMetric("lcp", Math.round(last.startTime));
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {
    // unsupported
  }

  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!e.hadRecentInput && e.value) clsValue += e.value;
      }
      reportMetric("cls", Number(clsValue.toFixed(3)), "none");
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {
    // unsupported
  }

  try {
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & { duration?: number };
        if (e.duration != null) reportMetric("inp", Math.round(e.duration));
      }
    });
    inpObserver.observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  } catch {
    // unsupported — INP may use first-input in older browsers
  }
}

export function reportDashboardInteractive(durationMs: number): void {
  reportMetric("dashboard.interactive", durationMs);
}

export function sampleQueryCacheStats(stats: { queries: number; fetching: number }): void {
  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") return;
  if (stats.queries === 0) return;
  console.debug(`[rum] react-query queries=${stats.queries} fetching=${stats.fetching}`);
}
