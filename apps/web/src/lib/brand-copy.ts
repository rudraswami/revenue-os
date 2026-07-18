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

/** Homepage — How it works / The Layer */
export const HOME_LAYER = {
  label: "How it works",
  title: "WhatsApp is the conversation. Growvisi is the deal.",
  subtitle:
    "Every message classified. Every reply owned. Every deal tracked in ₹.",
} as const;

/** Homepage — Industries */
export const HOME_INDUSTRIES = {
  label: "Industries",
  title: "Built for teams that sell on WhatsApp",
  subtitle: "Same revenue layer — shaped by how your industry closes.",
} as const;

export const INDUSTRY_STORIES = [
  {
    id: "real-estate",
    title: "Real Estate",
    context: "Site visit · Mumbai",
    message: "Is the 3BHK in Andheri still available for a visit this weekend?",
    classify: "Site visit request · understood",
    outcome: "Negotiation",
    value: "₹1.2 Cr",
    href: "/solutions/real-estate",
  },
  {
    id: "education",
    title: "Education",
    context: "Admissions · Bengaluru",
    message: "Need the Class 11 fee structure and batch timings for my daughter.",
    classify: "Admission enquiry · understood",
    outcome: "Qualified",
    value: "Hot lead",
    href: "/solutions/education",
  },
  {
    id: "healthcare",
    title: "Healthcare",
    context: "Clinic · Pune",
    message: "Can we book a consultation for my mother this Thursday?",
    classify: "Appointment request · understood",
    outcome: "Your turn",
    value: "Meera",
    href: "/solutions/healthcare",
  },
  {
    id: "automotive",
    title: "Automotive",
    context: "Dealership · Delhi NCR",
    message: "Is the new model available for a test drive on Saturday?",
    classify: "Test drive · understood",
    outcome: "Assigned",
    value: "Rahul",
  },
  {
    id: "interior",
    title: "Interior Design",
    context: "Modular · Hyderabad",
    message: "Quote for full-home modular — 3BHK, move-in in 8 weeks.",
    classify: "Consultation · understood",
    outcome: "Proposal",
    value: "₹4.8L",
  },
  {
    id: "d2c",
    title: "D2C",
    context: "WhatsApp shop · Pan India",
    message: "Do you ship to Bangalore? Need 50 units with bulk pricing.",
    classify: "Bulk order · understood",
    outcome: "Negotiation",
    value: "₹18,400",
    href: "/solutions/d2c",
  },
] as const;

/** Homepage — Customer proof / pilot program */
export const HOME_PILOT = {
  label: "Customer proof",
  title: "Real pilots, real metrics",
  subtitle:
    "We're onboarding WhatsApp sales teams in India. Verified before/after data lands here — not invented case studies.",
  cohortBadge: "Pilot cohort · open",
  rolloutTitle: "30-day rollout",
  ctaBody:
    "Join the first cohort. We measure outcomes in your Analytics — with your permission, stories and numbers publish here.",
  metricsNote: "Metrics publish after the first cohort completes",
  icp: "Ideal fit: 3–12 people · 100+ WhatsApp leads/month · India",
} as const;

/** Homepage — revenue leakage calculator (before pricing) */
export const HOME_LEAKAGE = {
  label: "Revenue impact",
  title: "What cold WhatsApp leads cost you",
  subtitle:
    "Leads that need a person but sit unassigned — estimate the ₹ slipping through before you pick a plan.",
} as const;

/** Homepage — slim pricing preview */
export const HOME_PRICING = {
  label: "Pricing",
  title: "Less than one lost deal per month",
  subtitle: "Start on Solo or Team. 14-day trial · no credit card · upgrade anytime on Razorpay.",
} as const;

export const PILOT_ROLLOUT = [
  {
    id: "w1",
    week: "Week 1",
    title: "Connect + first classified lead",
    detail: "WhatsApp live on Meta Cloud API. First inbound message classified in Inbox.",
    signal: "First AI classification",
  },
  {
    id: "w2",
    week: "Week 2–3",
    title: "Team adopts Inbox + Pipeline",
    detail: "Take over on handoffs. Move deals with ₹ values. Humans reply — never auto-sent.",
    signal: "Pipeline ₹ visible",
  },
  {
    id: "w4",
    week: "Week 4",
    title: "Compare vs baseline",
    detail: "Win rate, response time, and pipeline value from Analytics — your data stays yours.",
    signal: "Before / after report",
  },
] as const;

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
