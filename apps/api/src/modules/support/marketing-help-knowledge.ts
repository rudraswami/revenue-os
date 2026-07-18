/** Public marketing site assistant — product/pricing FAQ only (not customer WhatsApp). */

export const MARKETING_HELP_FAQ = [
  {
    id: "pricing",
    q: "How much does Growvisi cost?",
    a: "Solo ₹999/mo, Team ₹2,999/mo, Operator ₹5,999/mo (INR via Razorpay). 14-day trial · 500 leads · 1 WhatsApp number · No credit card.",
  },
  {
    id: "auto-reply",
    q: "Does Growvisi auto-reply to customers?",
    a: "No. Growvisi AI classifies, scores, and flags YOUR TURN — your team sends human replies from Conversations. Optional Meta Business Agent can handle FAQ in the WhatsApp app.",
  },
  {
    id: "trial",
    q: "How does the free trial work?",
    a: "14-day trial with full product access, 500 classified leads, 1 WhatsApp number, no credit card. Upgrade on Razorpay when ready.",
  },
  {
    id: "setup",
    q: "WhatsApp setup help",
    a: "Connect via Meta API Setup token or Embedded Signup. Most teams see first classified inbound within 15 minutes. Email it@growvisi.com or message sales on WhatsApp for setup help.",
  },
  {
    id: "your-turn",
    q: "What is YOUR TURN?",
    a: "When a customer needs a person, the thread is flagged. Your team sees it in Conversations, gets alerts, assigns the deal, and replies as a human — never an auto-sent Growvisi message.",
  },
] as const;

export const MARKETING_HELP_EXCERPT = `
Growvisi is the revenue layer for WhatsApp sales teams in India.
- Conversations: shared inbox with AI classification
- YOUR TURN: alerts when a human should reply
- Pipeline: Kanban with deal values in INR
- Analytics: funnel and revenue metrics
- Humans reply; Growvisi never auto-messages end customers
- Billing: Razorpay, INR, 14-day trial
- Plans: Solo (starter), Team (growth), Operator (pro/agency)
`.trim();

export function formatMarketingFaqForPrompt(): string {
  return MARKETING_HELP_FAQ.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
}
