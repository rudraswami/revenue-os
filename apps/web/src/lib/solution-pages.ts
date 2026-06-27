/**
 * Solution landing pages — industry-specific GTM (India WhatsApp sellers).
 */

import type { MarketingIconName } from "./marketing-icons";

export type SolutionPageSlug = "real-estate" | "education" | "healthcare" | "d2c";

export type SolutionPageData = {
  slug: SolutionPageSlug;
  navLabel: string;
  navDescription: string;
  icon: MarketingIconName;
  /** Dark hero gradient */
  heroGradient: string;
  accentColor: string;
  headline: string;
  subhead: string;
  heroStat: { label: string; value: string };
  pains: string[];
  outcomes: string[];
  workflow: Array<{ step: string; title: string; body: string }>;
  features: Array<{ title: string; body: string }>;
  proofLine: string;
  idealCustomer: string;
};

export const SOLUTION_PAGES: Record<SolutionPageSlug, SolutionPageData> = {
  "real-estate": {
    slug: "real-estate",
    navLabel: "Real estate",
    navDescription: "Plot visits & site tours from WhatsApp",
    icon: "landmark",
    heroGradient: "from-[#0b1c30] via-[#132a45] to-[#0b1c30]",
    accentColor: "#6cf8bb",
    headline: "Turn WhatsApp plot inquiries into site visits — and site visits into bookings",
    subhead:
      "Indian real estate teams get 200+ WhatsApp pings per week. Growvisi classifies buyer intent, assigns the right agent, and tracks every deal in ₹ — while your team replies from Inbox.",
    heroStat: { label: "Typical team size", value: "3–15 agents" },
    pains: [
      "Leads sit on agent personal phones — no manager visibility",
      "Same buyer messages two reps; nobody owns the follow-up",
      "No pipeline ₹ — leadership can't forecast bookings",
      "Site-visit requests get lost in broadcast groups",
    ],
    outcomes: [
      "Every inquiry classified: buying, site visit, pricing, location",
      "Handoff when buyer is hot — Take over assigns agent + task",
      "Pipeline stages: New → Site visit → Negotiation → Won",
      "Deal ₹ on every card — revenue pulse for the sales head",
    ],
    workflow: [
      { step: "01", title: "Lead pings on WhatsApp", body: "“3BHK Whitefield under 1.2Cr?” lands on your business line." },
      { step: "02", title: "AI scores intent", body: "High intent + location match → flagged for senior agent." },
      { step: "03", title: "Human books site visit", body: "Rep replies from Inbox, moves card to Site visit." },
      { step: "04", title: "Leadership sees pipeline ₹", body: "Home + Analytics show funnel — not spreadsheet chaos." },
    ],
    features: [
      { title: "Shared inbox for channel partners", body: "One number, full team history — no lost threads." },
      { title: "Agent assignment", body: "Route by project, zone, or round-robin from Inbox." },
      { title: "Site-visit stage tracking", body: "Custom pipeline columns for how your brokerage closes." },
      { title: "Morning digest for owners", body: "Hot leads + handoffs on WhatsApp before the floor opens." },
    ],
    proofLine: "Built for Bangalore, Hyderabad, Pune brokerages selling on WhatsApp.",
    idealCustomer: "Brokerages & developers with 3+ agents and 100+ WA leads/month",
  },
  education: {
    slug: "education",
    navLabel: "Education",
    navDescription: "Admission leads scored by intent",
    icon: "graduation-cap",
    heroGradient: "from-[#1a1040] via-[#251b5c] to-[#0b1c30]",
    accentColor: "#a78bfa",
    headline: "Admission season runs on WhatsApp — run it with a pipeline, not chaos",
    subhead:
      "Coaching centres and edtech teams field “fees? batch timing? demo class?” all day. Growvisi scores intent, assigns counsellors, and tracks enrollment ₹ per counsellor.",
    heroStat: { label: "Peak season", value: "100–500 leads/wk" },
    pains: [
      "Counsellors reply from personal WhatsApp — no CRM trail",
      "High-intent parents wait hours; they enroll elsewhere",
      "Marketing can't prove which campaign drove admissions",
      "Managers can't see counsellor workload or conversion",
    ],
    outcomes: [
      "Intent tags: demo request, fees, scholarship, ready to pay",
      "Counsellor queue — hottest parents surfaced first",
      "Pipeline: Inquiry → Demo → Application → Enrolled",
      "Campaign attribution on Growth plan",
    ],
    workflow: [
      { step: "01", title: "Parent messages on WA", body: "“NEET batch fees and timing?” ingested automatically." },
      { step: "02", title: "AI routes to counsellor", body: "Score 85+ → handoff alert to available rep." },
      { step: "03", title: "Demo scheduled in Inbox", body: "Human reply with slot; stage moves to Demo." },
      { step: "04", title: "Enrolled = Won in ₹", body: "Deal value on card; funnel shows counsellor conversion." },
    ],
    features: [
      { title: "Counsellor assignment", body: "Assign threads by course, city, or language." },
      { title: "Follow-up tasks", body: "Take over creates task — no parent left after demo." },
      { title: "Team workload view", body: "See open deals per counsellor on Home." },
      { title: "Hindi digest for owners", body: "Daily brief on owner WhatsApp in Hindi." },
    ],
    proofLine: "For coaching, edtech, and training institutes across Tier-1 & Tier-2 India.",
    idealCustomer: "Admission teams with 2+ counsellors and seasonal WA volume",
  },
  healthcare: {
    slug: "healthcare",
    navLabel: "Healthcare",
    navDescription: "Appointment requests prioritized",
    icon: "stethoscope",
    heroGradient: "from-[#0b1c30] via-[#0d2838] to-[#0a2e2a]",
    accentColor: "#6cf8bb",
    headline: "Patients book on WhatsApp — your front desk needs a system, not sticky notes",
    subhead:
      "Clinics, diagnostics, and dental practices get appointment requests, report queries, and follow-ups on WhatsApp. Growvisi prioritizes urgent threads and tracks patient journeys without replacing your EMR.",
    heroStat: { label: "Common flow", value: "Appointment → Visit → Follow-up" },
    pains: [
      "Reception forwards screenshots — context gets lost",
      "Urgent cases buried under general inquiries",
      "No visibility on who promised a callback",
      "Doctors can't see which leads converted to visits",
    ],
    outcomes: [
      "Urgency & intent classified on every inbound",
      "Handoff to coordinator when human needed fast",
      "Pipeline: Inquiry → Appointment → Visit → Follow-up",
      "Human replies only — no AI messaging patients",
    ],
    workflow: [
      { step: "01", title: "Patient messages clinic WA", body: "“MRI slot tomorrow?” or “report ready?”" },
      { step: "02", title: "AI flags urgency", body: "Time-sensitive requests prioritized in Inbox." },
      { step: "03", title: "Coordinator replies", body: "Human confirmation from Inbox — not a bot." },
      { step: "04", title: "Visit tracked on pipeline", body: "Conversion visible for clinic admin." },
    ],
    features: [
      { title: "Priority inbox sorting", body: "Handoffs and unread surfaced on Home." },
      { title: "Multi-location numbers", body: "Up to 3 numbers on Team plan — branch-wise." },
      { title: "Team roles", body: "Coordinator vs admin — assign with clarity." },
      { title: "Compliance-friendly", body: "Growvisi classifies & tracks — you control patient replies." },
    ],
    proofLine: "For multi-doctor clinics and diagnostic chains using WhatsApp for bookings.",
    idealCustomer: "Clinics with 2+ coordinators and 50+ WA inquiries/week",
  },
  d2c: {
    slug: "d2c",
    navLabel: "D2C & retail",
    navDescription: "Campaign click-to-WA → won orders",
    icon: "store",
    heroGradient: "from-[#1c0b30] via-[#2d1545] to-[#0b1c30]",
    accentColor: "#f472b6",
    headline: "Your Instagram ad clicks WhatsApp — track every order to revenue ₹",
    subhead:
      "D2C brands run click-to-WhatsApp campaigns but lose attribution after the chat starts. Growvisi links campaigns to pipeline, tracks Razorpay → Won, and shows which creative actually converts.",
    heroStat: { label: "Attribution gap", value: "Ad click → WA → ₹" },
    pains: [
      "Meta shows clicks; you can't tie chats to orders",
      "Support and sales share one number — messy handoffs",
      "Cart abandoners on WA never get structured follow-up",
      "Founder can't see pipeline ₹ by campaign",
    ],
    outcomes: [
      "Click-to-WA links with UTM attribution",
      "Lead score for “ready to buy” vs “just browsing”",
      "Razorpay payment → auto-mark Won (Growth+)",
      "Campaign performance on Analytics",
    ],
    workflow: [
      { step: "01", title: "Ad → WhatsApp", body: "Customer taps WA from Instagram / Meta ad." },
      { step: "02", title: "Classified & scored", body: "“Want to order” vs “shipping query” separated." },
      { step: "03", title: "Human closes in chat", body: "Support sends payment link; replies from Inbox." },
      { step: "04", title: "Razorpay → Won", body: "Payment webhook marks deal won — revenue attributed." },
    ],
    features: [
      { title: "WhatsApp campaigns", body: "Template sends to segments — Growth plan." },
      { title: "Attribution dashboard", body: "See which links and campaigns produce leads." },
      { title: "Order value on pipeline", body: "AOV tracked per deal for forecasting." },
      { title: "Multi-agent support", body: "5 team members on Team plan — peak sale ready." },
    ],
    proofLine: "For D2C, beauty, fashion, and consumer brands selling on WhatsApp in India.",
    idealCustomer: "Brands spending on Meta WA ads with 200+ inbound chats/month",
  },
};

export const SOLUTION_SLUGS = Object.keys(SOLUTION_PAGES) as SolutionPageSlug[];

export function getSolutionPage(slug: string): SolutionPageData | null {
  return slug in SOLUTION_PAGES ? SOLUTION_PAGES[slug as SolutionPageSlug] : null;
}
