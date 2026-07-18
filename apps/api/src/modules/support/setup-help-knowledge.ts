/** Curated Growvisi setup knowledge — merchant onboarding only (not customer chat). */
export const SETUP_HELP_FAQ = [
  {
    id: "which-option",
    q: "Phone or API — which should I pick?",
    a: "Most Indian businesses reply from the WhatsApp Business app on their phone. Choose “I reply from my phone”. Choose API only if you already use Cloud API, WATI, Interakt, or similar.",
  },
  {
    id: "facebook-vs-token",
    q: "Facebook one-click vs Meta API token?",
    a: "Facebook Embedded Signup is fastest after App Review. During review, paste the temporary token from Meta API Setup (WhatsApp → API Setup in Meta Developers).",
  },
  {
    id: "test-message",
    q: "Why doesn't my test message show in Conversations?",
    a: "Meta's test button is outbound only. Message your business number from your personal WhatsApp. Inbound messages appear in Conversations within seconds.",
  },
  {
    id: "token-expiry",
    q: "Token expired — what now?",
    a: "Paste a fresh token under Settings → WhatsApp → Refresh access token. You do not need to disconnect the number.",
  },
  {
    id: "growvisi-replies",
    q: "Does Growvisi auto-reply to customers?",
    a: "No. Growvisi classifies, tracks pipeline, and alerts your team. Humans reply from Conversations or WhatsApp.",
  },
] as const;

export const SETUP_HELP_DOC_EXCERPT = `
Growvisi connects your existing WhatsApp Business number on Meta Cloud API.
Connect paths:
1) I reply from my phone — WhatsApp Business app (CoEx). Keep the mobile app; Growvisi classifies inbound.
2) I use WhatsApp API already — Cloud API, WATI, Interakt, or migrating from another tool.

Go-live checklist after connect:
- Webhooks subscribed
- First customer message (test from personal phone to business number)
- First AI classification in Conversations
- Deal in Pipeline (stage or INR value)
- Message templates synced from Meta (for Campaigns)

Token lifecycle:
- Embedded Signup → long-lived token with auto-refresh
- API Setup paste → short-lived ~24h; refresh in Settings without disconnecting

Pricing: 14-day free trial, then from ₹999/mo INR via Razorpay. WhatsApp connection stays; billing gates team limits.

Agency (Pro): connect client numbers from Agency → Clients without switching workspace (Facebook or token).

Human help: book setup call via onboarding help or email it@growvisi.com
`.trim();

export function formatFaqForPrompt(): string {
  return SETUP_HELP_FAQ.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
}
