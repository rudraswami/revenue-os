export type MetricsPeriod = "7d" | "30d" | "90d" | "all";

export const METRICS_PERIOD_OPTIONS: Array<{ value: MetricsPeriod; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];
