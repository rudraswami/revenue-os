/** Canonical product copy — single source of truth for UI strings. */

export const BRAND_NAME = "Growvisi";

export const TAGLINE = "The revenue layer for WhatsApp sales teams";

export const CTA = {
  startTrial: "Start 14-day free trial",
  getStarted: "Get started",
  bookDemo: "Book a demo",
  signIn: "Sign in",
  signOut: "Sign out",
  createWorkspace: "Create workspace",
  openConversations: "Open conversations",
  requestDemo: "Request demo",
} as const;

export const NAV = {
  home: "Home",
  conversations: "Conversations",
  pipeline: "Pipeline",
  contacts: "Contacts",
  tasks: "Tasks",
  campaigns: "Campaigns",
  analytics: "Analytics",
  intelligence: "Intelligence",
  automations: "Automations",
  settings: "Settings",
} as const;

export const EYEBROW = {
  overview: "Overview",
  messaging: "Messaging",
  sales: "Sales",
  performance: "Performance",
  intelligence: "Intelligence",
  workflows: "Workflows",
  recommendations: "Recommendations",
  workspace: "Workspace",
  setup: "Setup",
} as const;

/** Conversations / Inbox — plain language for Indian SMB owners (no “handoff” jargon). */
export const CONVERSATIONS = {
  /** Filter chip + Home metric title */
  yourTurn: "Your turn",
  /** Short badge on list rows and thread header */
  waitingOnYou: "Waiting on you",
  /** Home metric when queue is empty */
  yourTurnClear: "Nothing waiting on you",
  /** Home metric subtitle when items exist */
  yourTurnHint: "Real people should reply — not a bot",
  /** Home CTA */
  seeWhoWaiting: "See who's waiting",
  /** Amber banner headline when AI flags a thread */
  needsYouTitle: (reason?: string | null) =>
    reason ? `This customer needs you — ${reason}` : "This customer needs you",
  /** Primary action on flagged threads */
  replyNow: "I'll reply now",
  /** Clears flag without sending */
  alreadyHandled: "Already handled",
  /** Shown under primary action */
  replyNowHint:
    "Assigns this chat to you, adds a follow-up task, and clears the alert.",
  /** Composer */
  composePlaceholder: "Write your WhatsApp reply…",
  composeFooter:
    "You send this message — Growvisi never auto-replies to customers.",
  composeCollapsed: "Reply from Growvisi",
  /** Empty right pane */
  selectTitle: "Choose a conversation",
  selectBody:
    "See messages, AI insights, and deal stage in one place. When it's your turn, reply here or continue in WhatsApp.",
  /** Thread controls */
  autoClassify: "Auto-classify",
  assignedTo: "Assigned to",
  unassigned: "Unassigned",
  scoreHot: (n: number) => `Hot lead · ${n}`,
  scoreWarm: (n: number) => `Score · ${n}`,
  openPipeline: "Open in pipeline",
  viewOnPipeline: "View on pipeline",
  /** Labeled deal ₹ — only when set on the lead */
  dealValue: (amount: string) => `Deal value · ${amount}`,
  dealClosed: (amount: string) => `Closed · ${amount}`,
  addDealValue: "Set deal ₹ on pipeline",
  /** Composer chrome */
  composeTitle: "Reply on WhatsApp",
  draftWithAi: "Suggest reply",
  minimizeComposer: "Minimize",
  sendReply: "Send",
  /** Timeline empty states */
  timelineEmptyClassify:
    "No AI insights yet — send or receive a message after WhatsApp is connected.",
  timelineEmptyEvents:
    "Stage changes and automations will show up here as the deal moves.",
  /** List filters */
  filterAll: "All",
  filterUnread: "Unread",
  filterUnassigned: "Unassigned",
} as const;

export type InboxListFilter = "all" | "handoff" | "unread" | "unassigned";
