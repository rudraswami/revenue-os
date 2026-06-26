/** Shared React Query cache timings — keep loaders stable across navigations. */

export const STALE = {
  /** Live counters: inbox unread, agent status */
  live: 30_000,
  /** Dashboard cards, insights, team workload */
  dashboard: 60_000,
  /** Metrics / funnel / SLA — changes less often */
  metrics: 120_000,
  /** Billing, templates, static config */
  config: 300_000,
} as const;

export const GC = {
  default: 5 * 60_000,
} as const;

export const QUERY_KEYS = {
  funnel: (period: string) => ["funnel-metrics", period] as const,
  conversationStats: (period?: string) =>
    period ? (["conversation-stats", period] as const) : (["conversation-stats"] as const),
  revenue: (period: string) => ["revenue-metrics", period] as const,
  sla: (period: string) => ["sla-metrics", period] as const,
  insights: (period: string) => ["insights", period] as const,
  agentStatus: ["agent-status"] as const,
  activityFeed: ["activity-feed"] as const,
  teamWorkload: ["team-workload"] as const,
  whatsappAccounts: ["whatsapp-accounts"] as const,
  billing: ["billing-status"] as const,
} as const;
