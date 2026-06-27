# Growvisi GTM — Founder North Star

**Last updated:** June 2025  
**Status:** Active merchandising framework (implementation in `apps/web/src/lib/gtm-copy.ts`)

---

## One sentence

**Meta replies in WhatsApp. Growvisi tracks every deal in ₹.**

Growvisi is the **revenue layer** for Indian SMBs selling on WhatsApp — not a chatbot, not a generic CRM.

---

## Who we sell to (two doors)

| Door | Buyer | Wedge | Plan |
|------|--------|-------|------|
| **SMB** | Owner + 1–5 sales reps | Connect → classify → pipeline | Solo / **Team** |
| **Agency** | Meta partner, WA agency | Multi-client hub + install kit | **Operator** |

Marketing: homepage + `/agencies`. Product: Agency hub (Pro), Partner kit (linked from agency page).

---

## Outcome tiers (marketing names → billing SKUs)

| Name | SKU | ₹/mo | Promise |
|------|-----|------|---------|
| Solo | starter | 999 | Never lose a WhatsApp lead |
| **Team** | growth | 2,999 | Everyone knows who owns which deal |
| Operator | pro | 5,999 | Run many WhatsApp businesses from one hub |

**Team is default push** (“Most popular”). Trial: 14 days, 500 leads, 1 number, no card.

---

## Activation success (< 15 minutes)

1. Connect WhatsApp (`/dashboard/connection`)
2. First inbound → **Inbox** shows classified thread
3. Move deal on **Pipeline**
4. Optional: enable **morning digest** (Automations)
5. Optional: Razorpay → Won, deal ₹ values (Growth+)

**Do not** send users to Intelligence explainer for step 2 — Inbox is the proof moment.

---

## Non-negotiable boundaries (say everywhere)

- Customer **replies** = Meta Business Agent in WhatsApp
- Growvisi = **classify, assign, alert, measure** — no fake auto-reply toggles
- Limits enforced **server-side** (`EntitlementsService`); UI shows usage meter from `GET /billing`

---

## Proof stack (honest)

1. **No unattributed hero stats** — use trial limits, activation time, illustrative ROI calculator
2. **One real pilot case study** — replace GreenSpace illustrative block when available
3. **15-min demo script:** connect → send test WA → Inbox classification → pipeline drag → digest toggle

---

## What not to build before GTM is fixed

- New backend features for “AI agent” positioning
- Email CRM, SSO, multi-channel inbox
- Synthetic ROI claims without pilot data

---

## Key files

| Area | Path |
|------|------|
| GTM copy | `apps/web/src/lib/gtm-copy.ts` |
| Pricing merchandising | `apps/web/src/lib/pricing-plans.ts` |
| Hero / pricing / agencies | `apps/web/src/components/marketing/` |
| In-app meter | `apps/web/src/components/dashboard/usage-meter-card.tsx` |
| Activation strip | `apps/web/src/components/dashboard/revenue-setup-strip.tsx` |
