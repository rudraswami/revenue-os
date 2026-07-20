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
  conversationQueueStats: ["conversation-queue-stats"] as const,
  revenue: (period: string) => ["revenue-metrics", period] as const,
  sla: (period: string) => ["sla-metrics", period] as const,
  insights: (period: string) => ["insights", period] as const,
  agentStatus: ["agent-status"] as const,
  activityFeed: ["activity-feed"] as const,
  teamWorkload: ["team-workload"] as const,
  whatsappAccounts: ["whatsapp-accounts"] as const,
  billing: ["billing-status"] as const,
  authMe: ["auth-me"] as const,
  onboardingProgress: ["onboarding-progress"] as const,
  onboardingCoaching: ["onboarding-coaching"] as const,
  shellBootstrap: ["shell-bootstrap"] as const,
  agencyStatus: ["agency-status"] as const,
  whatsappConnectionHealth: ["whatsapp-connection-health"] as const,
  paymentIntegration: ["payment-integration"] as const,
  conversationCapabilities: ["conversation-capabilities"] as const,
  conversation: (id: string) => ["conversation", id] as const,
  conversationThread: (id: string) => ["conversation-thread", id] as const,
  conversationInboxContext: (id: string) => ["conversation-inbox-context", id] as const,
  conversationKnowledgeGaps: (id: string) => ["conversation-knowledge-gaps", id] as const,
  leadTimeline: (leadId: string) => ["lead-timeline", leadId] as const,
  leadNotes: (leadId: string) => ["lead-notes", leadId] as const,
  /** Prefix for inbox list queries — use with getQueriesData / invalidateQueries. */
  conversationsList: ["conversations"] as const,
  pipeline: (filter: string, perStageLimit: number) =>
    ["pipeline", filter, perStageLimit] as const,
  pipelineSummary: ["pipeline-summary"] as const,
  contacts: (
    q: string,
    stage: string | undefined,
    tagId: string | undefined,
    ownerId: string | undefined,
    page: number,
  ) => ["contacts", q, stage, tagId, ownerId, page] as const,
} as const;
