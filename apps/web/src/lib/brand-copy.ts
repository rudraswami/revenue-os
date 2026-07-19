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

/** Sticky header promo — YOUR TURN wedge */
export const HOME_HEADER_PROMO =
  "YOUR TURN when customers need a human · Pipeline ₹ tracked · 14-day trial";

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

/** Homepage — problem (no invented funnel %) */
export const HOME_PROBLEM = {
  label: "The problem",
  title: "WhatsApp sells. Chaos loses deals.",
  subtitle:
    "Leads land on personal phones. No one owns the follow-up. Pipeline lives in memory — not in ₹.",
  cta: "Model your leakage",
  pains: [
    {
      title: "No ownership",
      desc: "“Someone will reply” — but nobody is assigned when it’s their turn.",
    },
    {
      title: "No pipeline ₹",
      desc: "Managers can’t see deals, stages, or what’s waiting on the team.",
    },
    {
      title: "Hot leads wait",
      desc: "Buyers with intent sit behind cold chats and broadcast replies.",
    },
    {
      title: "Deals die quietly",
      desc: "No follow-up task, no alert — revenue leaks in 24 hours.",
    },
  ],
  bridge:
    "Growvisi is the revenue layer after the chat: classify, assign YOUR TURN, track pipeline ₹.",
} as const;

/** Homepage — Meta in-chat AI vs Growvisi */
export const HOME_META_COMPARE = {
  label: "Why not just Meta AI?",
  title: "Meta helps you reply. Growvisi helps you close.",
  subtitle:
    "In-chat AI answers faster. Growvisi records who should reply, what stage the deal is in, and how much pipeline ₹ is at stake.",
  metaTitle: "Meta Business Agent",
  growvisiTitle: "Growvisi revenue layer",
  rows: [
    { topic: "Replies in WhatsApp", meta: true, growvisi: "Human team (optional Meta FAQ bot)" },
    { topic: "Shared team inbox", meta: false, growvisi: true },
    { topic: "YOUR TURN — who owns the reply", meta: false, growvisi: true },
    { topic: "Pipeline + deal ₹ in INR", meta: false, growvisi: true },
    { topic: "Win / loss analytics", meta: false, growvisi: true },
    { topic: "Growvisi auto-replies customers", meta: "n/a", growvisi: "Optional — guarded simple replies only" },
  ],
} as const;

/** Homepage — trust strip */
export const HOME_TRUST = {
  items: [
    "Meta WhatsApp Cloud API",
    "Razorpay · INR billing",
    "You control replies — optional guarded auto-send",
    "14-day trial · no credit card",
  ],
} as const;

/** Homepage + marketing FAQ */
export const HOME_FAQ = [
  {
    q: "Can I keep my existing WhatsApp business number?",
    a: "Yes. Growvisi connects to your existing WhatsApp Business number on Meta's Cloud API. Your customers keep messaging the same number.",
  },
  {
    q: "Does AI reply to customers automatically?",
    a: "By default your team sends every reply from Conversations or WhatsApp. You can enable guarded auto-send in Automations so Growvisi sends low-risk, grounded messages — greetings, thanks, and FAQs from your Business Knowledge. Complaints, ungrounded pricing, and deal terms always stay with your team. Optional Meta Business Agent can handle first-line FAQ in the WhatsApp app.",
  },
  {
    q: "What is YOUR TURN?",
    a: "When a customer needs a person — quote, visit, complaint, high intent — the thread is flagged for your team. Conversations shows a Your turn filter; Home and digest alert you. Take over assigns the deal, creates a task, and clears the alert. You reply as a human.",
  },
  {
    q: "How long does setup take?",
    a: "Most teams connect WhatsApp and see their first AI-classified lead within 15 minutes. Meta API Setup or Embedded Signup — we guide you step by step.",
  },
  {
    q: "Can multiple agents use one WhatsApp number?",
    a: "Yes. Everyone shares one inbox with full history, lead scores, and pipeline stages.",
  },
  {
    q: "How does billing work?",
    a: "INR plans from ₹999/mo via Razorpay after a 14-day free trial (500 leads, 1 WhatsApp number, no credit card). Upgrade or cancel from dashboard settings.",
  },
  {
    q: "Do I need an OpenAI key?",
    a: "AI classification uses your workspace OpenAI API key in Settings. You control usage and cost.",
  },
] as const;

/** Homepage — final CTA */
export const HOME_CTA = {
  label: "Pilot cohort open",
  title: "Track your own before/after in 30 days",
  body: "14-day trial · 500 leads · no credit card. Join teams measuring win rate and pipeline ₹ on WhatsApp — not invented case studies.",
} as const;

/** Marketing WhatsApp + on-site AI assistant */
export const MARKETING_SUPPORT = {
  dockTitle: "Questions?",
  whatsAppTitle: "WhatsApp us",
  whatsAppBody: "Sales and setup — a human on our team replies, usually Mon–Sat IST.",
  whatsAppCta: "Open WhatsApp",
  aiTitle: "Product assistant",
  aiBody:
    "AI answers pricing and product FAQs on this site. For sales or Meta setup help, message us on WhatsApp. On your workspace, Growvisi only auto-sends when you turn on Send simple replies.",
  aiPlaceholder: "Ask about pricing, trial, YOUR TURN…",
  aiPlaceholderHi: "कीमत, ट्रायल, YOUR TURN…",
  localeEn: "EN",
  localeHi: "हिं",
  whatsAppEscalate: "Continue on WhatsApp with our team",
  aiOffline:
    "Assistant is offline — message us on WhatsApp or email it@growvisi.com.",
  defaultWhatsAppMessage:
    "Hi Growvisi — I'd like to know more about WhatsApp pipeline for my team.",
  quickQuestions: [
    "What is YOUR TURN?",
    "Does Growvisi auto-reply?",
    "How does the 14-day trial work?",
    "Starter vs Growth pricing",
  ],
  fabTeaser: "Questions about YOUR TURN or pricing?",
  fabGreeting: "I'm Priya from Growvisi",
  fabSubtext: "Ask how YOUR TURN, Pipeline ₹, and trial work — our team replies on WhatsApp.",
  fabWhatsAppLink: "Talk to our team on WhatsApp →",
  fabTeaserCta: "Tap to ask Priya",
  fabSectionTeasers: {
    hero: "See YOUR TURN when a lead writes",
    problem: "Stop the 'did anyone reply?' chaos",
    engine: "Inbox → Pipeline → YOUR TURN",
    industries: "YOUR TURN for your industry",
    "case-study": "Week one with YOUR TURN live",
    "revenue-impact": "Pipeline ₹ you're leaving on WhatsApp",
    pricing: "Starter vs Growth — quick answer",
    "meta-compare": "Meta Inbox vs Growvisi YOUR TURN",
    compare: "CRM vs YOUR TURN on WhatsApp",
    product: "Inbox, Pipeline & YOUR TURN tour",
    trust: "You control replies on your number",
    faq: "Ask before your 14-day trial",
    cta: "Start with YOUR TURN today",
    default: "Questions about YOUR TURN?",
  },
} as const;

/** Contact / talk to us page */
export const CONTACT_PAGE = {
  heroLabel: "Talk to us",
  heroTitle: "Demo, WhatsApp, or email — your choice",
  heroSubtitle:
    "One WhatsApp flow for sales demos and enterprise rollouts — fill your details, scan the QR, and send. Humans reply — never a bot.",
  emailSectionTitle: "Request a demo by email",
  inquirySectionTitle: "Message us on WhatsApp",
  inquirySectionSubtitle:
    "Pick demo or enterprise, fill your details — scan the QR or tap Open WhatsApp. Your message is ready to send.",
} as const;

export const WHATSAPP_INQUIRY = {
  typeLabel: "What are you reaching out for?",
  types: {
    sales: {
      label: "Demo & sales",
      short: "Demo",
      cta: "Open WhatsApp with my details",
      teamLabel: "Team size",
      messagePlaceholder: "What should we know before the call? (optional)",
    },
    enterprise: {
      label: "Enterprise & agency",
      short: "Enterprise",
      cta: "Open WhatsApp — enterprise inquiry",
      teamLabel: "Scale (clients / locations)",
      messagePlaceholder: "Franchise, agency hub, SLA needs… (optional)",
    },
  },
  fields: {
    name: "Your name",
    company: "Company",
    phone: "Your WhatsApp number",
    phoneHint: "10-digit mobile — included in the message to our team",
  },
  qrCaption: "Scan with your phone camera",
  steps: ["Fill your details", "Scan QR or tap below", "Send — a human replies"],
  previewLabel: "Message preview",
  previewEmpty: "Complete the form to generate your WhatsApp message and QR code.",
  humanReply: "Mon–Sat IST · human replies only",
  configureHint: "WhatsApp is being configured — email",
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
    detail: "Take over on handoffs. Move deals with ₹ values. Your team owns high-stakes replies; optional guarded auto-send for simple messages.",
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

/** Auth / signup / login — aligned with landing YOUR TURN wedge */
export const AUTH = {
  trialBadge: "14-day free trial",
  trialBullets: "500 leads · 1 WhatsApp number · No credit card",
  humanReplyNote:
    "Your team replies on WhatsApp. Enable guarded auto-send in Automations for low-risk messages grounded in your docs.",
  stepLabel: "Step 1 of 2 · Create workspace",
  whatsNextTitle: "What happens next",
  whatsNextSteps: [
    "Create your workspace",
    "Connect WhatsApp in onboarding (skippable)",
    "First lead classified in Inbox",
  ],
  brandBadge: "YOUR TURN on WhatsApp",
  brandHeadline: "WhatsApp conversations in. Pipeline ₹ out.",
  brandBody:
    "When a customer writes, Growvisi shows who should respond and tracks the deal — so nothing slips while your team is busy.",
  brandFloatHandoff: "Handoff flagged",
  brandFloatHandoffValue: "YOUR TURN · Meera",
  brandFloatPipeline: "Pipeline",
  brandFloatPipelineValue: "Qualified · ₹4.2L",
  mobileWedge: "Always know whose turn it is.",
  verifyBanner: "Verify your email to activate your workspace.",
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
    "You send this message from your business number. Growvisi only auto-sends when guarded auto-reply is on in Automations.",
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
