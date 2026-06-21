export type MetricsPeriod = "7d" | "30d" | "90d" | "all";

export function parseMetricsPeriod(value?: string): MetricsPeriod {
  if (value === "7d" || value === "30d" || value === "90d" || value === "all") {
    return value;
  }
  return "30d";
}

export function createdAtFilter(period: MetricsPeriod): { gte?: Date } {
  if (period === "all") return {};
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const gte = new Date();
  gte.setHours(0, 0, 0, 0);
  gte.setDate(gte.getDate() - days);
  return { gte };
}
