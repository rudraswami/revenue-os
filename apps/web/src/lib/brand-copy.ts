/** Canonical product copy — single source of truth for UI strings. */

export const BRAND_NAME = "Growvisi";

export const TAGLINE = "The revenue layer for WhatsApp sales teams";

/** Homepage hero — left column (canonical) */
export const HOME_HERO = {
  label: "For WhatsApp sales teams",
  headline: "Always know whose turn it is.",
  headlineAccent: "whose turn it is",
  subhead: "WhatsApp conversations in. Pipeline ₹ out.",
  body: "When a customer writes, Growvisi shows who should respond and tracks the deal — so nothing slips while your team is busy.",
  proof: "No more “did anyone reply?” threads.",
  trialNote: "14-day trial · No card required",
} as const;

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
  /** Timeline */
  timelineTitle: "Activity",
  timelineSubtitle: "Recent changes on this deal",
  timelineConfidence: "Classification confidence",
  timelineEmptyClassify:
    "Nothing here yet. Activity appears after WhatsApp is connected and messages come in.",
  timelineEmptyEvents:
    "No activity yet. Stage updates and AI reviews will show up here.",
  /** List filters */
  filterAll: "All",
  filterUnread: "Unread",
  filterUnassigned: "Unassigned",
  /** Outbound — start a new WhatsApp thread */
  newMessage: "New message",
  newOutboundTitle: "Message a customer",
  newOutboundHint:
    "Use a Meta-approved template for new numbers. Free text works if they messaged you in the last 24 hours.",
} as const;

export type { InboxListFilter, InboxListScope } from "./i18n/conversations-copy";
