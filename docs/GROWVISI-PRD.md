# Growvisi — Product Requirements Document (PRD)

**Version:** 1.0  
**Last updated:** June 2026  
**Owner:** Product + Engineering  
**Status:** Living document — source of truth for what Growvisi is and what it is not

---

## 1. Executive summary

**Growvisi is the revenue layer for WhatsApp-first sales teams.**

Meta Business Agent (and similar tools) solve *speed of reply*. Growvisi solves *revenue operations*: who the lead is, what stage they are in, whether AI or a human should act, what happened on the timeline, and whether the deal closed.

**One-line positioning:** *Sync every WhatsApp conversation to revenue.*

| | |
|---|---|
| **Category** | WhatsApp-native revenue OS (not generic CRM) |
| **Geo** | India-first (INR, Razorpay, UPI/cards/netbanking) |
| **ICP** | D2C, clinics, coaches, agencies, local services — 1–20 person teams |
| **Wedge** | Connect WhatsApp → classify → pipeline → team action → analytics |

---

## 2. Problem statement

### 2.1 Customer pain

1. **Replies happen; outcomes don't get tracked** — fast WhatsApp replies don't create pipeline visibility.
2. **No shared team view** — leads live on personal phones; handoffs are lost.
3. **No audit trail** — nobody knows what AI inferred, when stage changed, or why a deal was lost.
4. **Revenue is invisible** — founders can't answer funnel, conversion, or deal value without spreadsheets.

### 2.2 Why now

Meta invested heavily in in-chat AI (Business Agent). That increases message volume without giving SMBs **pipeline, scoring, assignment, or revenue metrics**. Growvisi sits *above* the chat surface as the intelligence + ops layer.

---

## 3. Product vision

### 3.1 North star

> Every inbound WhatsApp message becomes a tracked lead with a clear next action and measurable revenue outcome.

### 3.2 System diagram (mental model)

```
Customer (WhatsApp)
        │
        ▼
Meta Business Agent ──► replies in WhatsApp (customer-facing)
        │
        ▼ webhooks
Growvisi API ──► ingest · classify · score · pipeline · automations (email)
        │
        ▼
Team dashboard ──► assign · move stages · set deal value · draft reply (human takeover)
        │
        ▼
Analytics & insights ──► funnel · hot leads · stalled conversations
```

### 3.3 What Growvisi is NOT (v1 non-goals)

| Out of scope | Reason |
|--------------|--------|
| Growvisi auto-replying customers in WhatsApp | Meta Business Agent owns in-chat automation; we are the analytics/ops layer |
| Email CRM / multi-channel inbox | WhatsApp-first wedge; avoid CRM bloat |
| SSO / enterprise IdP | Not needed for ICP in v1 |
| In-app notification center | Email alerts + realtime inbox suffice for v1 |
| Stripe / USD billing | India-first → Razorpay INR only |
| Generic task/project management | Pipeline stages cover sales workflow |
| Building a chatbot competitor to Meta | Complementary positioning |

---

## 4. Personas

### P1 — Owner / Founder (primary buyer)

- Runs a WhatsApp-heavy business (₹5L–₹5Cr GMV)
- Wants pipeline visibility without hiring a CRM admin
- Cares about: conversion rate, hot leads, team accountability, trial → paid

### P2 — Sales agent / coordinator

- Handles day-to-day customer chats (often via Meta on phone)
- Uses Growvisi to: see assigned conversations, check lead score, move pipeline, get email alerts

### P3 — Ops / growth lead

- Configures: WhatsApp connection, business context docs, automations, reply templates
- Cares about: ingestion health, AI classification quality, billing limits

---

## 5. Product phases

### Phase A — MVP (shipped)

**Goal:** Prove WhatsApp → lead → pipeline → team value in &lt; 1 week for a new workspace.

| Area | Requirements | Status |
|------|--------------|--------|
| Auth & workspace | Register, login, org, 14-day trial | ✅ |
| WhatsApp | Manual token connect, webhook ingest, inbox | ✅ |
| Conversations | Thread view, search, unread, realtime | ✅ |
| Intelligence | AI classify → stage + score; handoff flag | ✅ |
| Pipeline | Kanban drag-drop, export CSV, deal value | ✅ |
| Team | Invites, member limits, conversation assign | ✅ |
| Automations | Stage auto-move, hot-lead email, follow-up email | ✅ |
| Billing | Razorpay checkout, plan limits, trial expiry | ✅ |
| Settings | Profile, business context, reply templates, API keys (Pro) | ✅ |

### Phase B — Full product (same wedge, hardened)

**Goal:** Paid retention + expansion revenue without becoming a generic CRM.

#### P0 — Ship first (reliability + campaigns)

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| B-P0-1 | Campaign delivery tracking | `waMessageId` stored on send; webhook updates recipient + `deliveredCount` / `failedCount` |
| B-P0-2 | Multi-number campaigns | Campaign `whatsappAccountId`; UI picker when org has multiple active numbers |
| B-P0-3 | Background workers on Vercel | `REDIS_URL` + BullMQ for classify/inbound when `useBackgroundWorkers()` true; inline fallback documented |
| B-P0-4 | Settings RBAC | Tabs hidden by role/plan; direct URL shows access panel; API guards aligned |
| B-P0-5 | Home recommendations | No separate Insights nav; `/dashboard/insights` → Home `#recommendations` |

#### P1 — Retention + trust

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| B-P1-1 | Audit log (read) | `GET /audit/logs` admin+; Activity log in Settings → Team |
| B-P1-2 | Billing cancel | `POST /billing/cancel` via Razorpay `cancel_at_cycle_end`; keeps `ACTIVE` until period end; UI shows scheduled cancellation |
| B-P1-3 | Attribution on Analytics | `/tracking/metrics` panel on Analytics with link to Growth settings |
| B-P1-4 | Connection health on Home | Compact banner when token/setup incomplete; full checklist in Settings |
| B-P1-5 | pgvector RAG | Business context in classify + suggest-reply (shipped in classify path) |
| B-P1-6 | Always-on workers | Redis required in prod; Sentry + job failure alerts |
| B-P1-7 | Meta token auto-refresh | Cron `whatsapp-token-refresh` exchanges tokens within 7d of expiry via `fb_exchange_token` |
| B-P1-8 | Lost-deal analytics | `GET /leads/metrics/lost-deals` + Analytics panel; lost reason on Pipeline |
| B-P1-9 | Guided onboarding | `GET /organizations/onboarding-progress` returns activation steps + nested `goLive` checklist; Home getting-started until first classified lead |
| B-P1-10 | Razorpay payment → Won | `POST /webhooks/payments/:orgId` + Settings → Growth configuration |
| B-P1-11 | Connection Health page | `/dashboard/connection` + sidebar nav; Home banner links here |
| B-P1-12 | Revenue pulse complete | `avgDaysToClose` + won ₹ on Home command center |
| B-P1-13 | One-click Take over | `POST /conversations/:id/takeover` — assign + task + resolve handoff |
| B-P1-14 | Mobile inbox + PWA | `manifest.json`, theme-color, safe-area composer on mobile |
| B-P2-1 | Won/lost reasons complete | `wonReason` on leads + Analytics won/lost panels |
| C-P0-1 | WhatsApp digest channel | Email, WhatsApp, or both; owner phone in Automations |
| C-P0-2 | Agency workspace | Pro hub: enable agency mode, create up to 15 client orgs, `/dashboard/agency` |
| C-P0-3 | Partner install kit | `/dashboard/partner` + `docs/PARTNER-INSTALL-KIT.md` |
| C-P0-4 | Hindi UI | User `locale` en/hi; sidebar nav + settings; digest Hindi body |
| C-P0-5 | Digest Meta template | Optional `whatsappTemplateName` for reliable outbound digest |

### Phase C — Expansion (post-PMF)

| Area | Requirements |
|------|--------------|
| Pipeline | Revenue forecasting, cohort views |
| Automations | Outbound webhooks, richer audit filters |
| Integrations | Shopify/Razorpay payment events |
| Billing | Self-serve invoices, usage overage |
| Growth | Agency workspaces, partner kits, Hindi UI |

| Area | Requirements | Priority |
|------|--------------|----------|
| WhatsApp | Embedded Signup live (post App Review), multi-number at scale | P0 |
| Intelligence | pgvector RAG in classify + suggest; conversation summaries | P1 |
| Pipeline | Revenue forecasting, cohort views | P1 |
| Automations | Outbound webhooks, richer audit log | P2 |
| Integrations | API keys + read API; Shopify/Razorpay payment events | P2 |
| Ops | Always-on workers (not Vercel inline), Sentry, usage dashboards | P1 |
| Billing | Self-serve portal, invoices, usage overage | P2 |

**Phase C themes (post-PMF):** multi-location workspaces, WhatsApp template campaigns, partner/tech-provider tooling, enterprise tier (SLA) — still no SSO unless demanded.

---

## 6. Information architecture (dashboard)

### 6.1 Navigation groups

| Group | Routes | Purpose |
|-------|--------|---------|
| **Overview** | `/dashboard`, `/dashboard/connection`, `/dashboard/agency`, `/dashboard/partner` | Health, clients, partner kit |
| **Engage** | `/dashboard/inbox`, `/dashboard/contacts`, `/dashboard/pipeline`, `/dashboard/tasks` | Day-to-day sales work |
| **Intelligence** | `/dashboard/analytics`, `/dashboard/ai` | Performance + AI transparency |
| **Automate** | `/dashboard/campaigns`, `/dashboard/automations` | Outbound + server-side workflows |
| **Account** | Settings, Pricing (user menu) | Workspace, billing, WhatsApp, profile |

**Enterprise IA rule:** No separate **Insights** nav page. Actionable recommendations (handoffs, unread, hot leads) live on **Home** (`#recommendations`). `/dashboard/insights` redirects to Home for legacy links and digest emails.

### 6.2 Page responsibilities

| Page | User job | Must show | Must NOT |
|------|----------|-----------|----------|
| **Home** | "What needs attention today?" | Setup progress, today's priorities, recommendations, hot leads, quick metrics | Duplicate Intel pages or long marketing copy |
| **Conversations** | "What did customers say?" | Thread, timeline, assign, AI toggle | Promise Growvisi auto-replies |
| **Pipeline** | "Where are deals?" | Kanban, score, deal value, hot badges | Email-style CRM fields |
| **Analytics** | "How are we performing?" | Funnel, period filters | Vanity charts without actions |
| **Intelligence** | "What does AI do?" | Capabilities, classification explainers, recent activity | Black-box AI claims |
| **Automations** | "What runs automatically?" | Honest server-side toggles | Fake toggles for Meta-owned behavior |
| **Settings** | "Configure workspace" | WhatsApp, team, billing, context, API keys | Legal walls in nav |
| **Pricing** | "Upgrade plan" | INR plans, trial status, Razorpay checkout | Stripe / USD |

### 6.3 Client loading & cache (web)

- **Route `loading.tsx`** on dashboard routes — skeleton matches final layout (no full-page spinners).
- **React Query** defaults: 60s stale, 5min GC; live data (inbox) 30s; metrics 120s (`apps/web/src/lib/query-config.ts`).
- **`placeholderData: (prev) => prev`** on dashboard queries — tab/nav switches show cached data while revalidating.
- **No duplicate Intel routes** — one insights API, consumed on Home only.

### 6.4 Onboarding flow

1. Register → workspace created (trial starts)
2. **Soft gate:** explore dashboard OR connect WhatsApp (`onboardingDismissed` skip)
3. Connect WhatsApp (Meta token wizard)
4. Send test message → verify ingestion
5. First classification → pipeline + timeline populate

**Rule:** Never hard-block pricing or settings behind WhatsApp connection.

---

## 7. Feature requirements (detailed)

### 7.1 WhatsApp channel

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| WA-1 | Ingest inbound messages via Cloud API webhook | Message appears in inbox &lt; 5s (p95) with correct contact |
| WA-2 | Create lead on first message per phone | Lead row + conversation link; dedupe by `organizationId + phone` |
| WA-3 | Connect via manual token (MVP) | User pastes token; number auto-detected; health shown in Settings |
| WA-4 | Embedded Signup (post-review) | OAuth flow; same ingest path as manual |
| WA-5 | Human takeover reply (secondary) | Dashboard send within 24h CSW; clearly labeled vs Meta Agent |
| WA-6 | Webhook security | HMAC verify in production; fail closed if secret missing |

### 7.2 AI intelligence

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| AI-1 | Classify on inbound | `AiRun` record; stage/score update when confidence thresholds met |
| AI-2 | Respect conversation `aiEnabled` | Skip classify when toggled off |
| AI-3 | Handoff flag | `requiresHuman` → metadata + realtime event |
| AI-4 | Suggest reply (draft only) | Uses thread + business context docs; never auto-sends |
| AI-5 | Trial/subscription gate | No classify when `hasAccess === false` |
| AI-6 | Transparency | Timeline shows classifications + automation events |

**Critical invariant:** Growvisi AI **classifies and advises**; Meta Business Agent **replies in WhatsApp**.

### 7.3 Pipeline & leads

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| PL-1 | Kanban by stage | Drag or mobile dropdown; persists via API |
| PL-2 | Lead score 0–100 | Visible on card; "Hot" badge at ≥ 80 |
| PL-3 | Deal value | `valueCents` in INR; editable on card |
| PL-4 | Stage history | Every change logged with reason / aiRunId |
| PL-5 | Export | CSV download with filters |

### 7.4 Team & collaboration

| ID | Requirement | Acceptance criteria |
|----|-------------|---------------------|
| TM-1 | Email invites | Token link; accept refreshes session to new org |
| TM-2 | Roles | OWNER, ADMIN, MEMBER (RBAC on billing + API keys) |
| TM-3 | Assign conversation | Dropdown of members; disables AI on assign (human ownership) |
| TM-4 | Plan limits | Block invite/connect when over `PLAN_LIMITS` |

### 7.5 Automations (server-side, honest)

| Automation | Trigger | Action | UI honesty |
|------------|---------|--------|------------|
| Welcome | N/A | Meta handles in WhatsApp | Info card only — no fake toggle |
| Auto stage | AI classify + pref on | Move stage when confidence high | Toggle |
| Hot lead alert | Score ≥ 80 + pref on | Email owners/admins | Toggle |
| Follow-up reminder | Cron daily + pref on | Email if stale 24h+ | Toggle |

### 7.6 Billing & entitlements

| Plan | INR/mo | Numbers | Team | Leads/mo |
|------|--------|---------|------|----------|
| Trial (14d) | 0 | 1 | 2 | 500 |
| Starter | 999 | 1 | 2 | 3,000 |
| Growth | 2,999 | 3 | 5 | 3,000 |
| Pro | 5,999 | 50 | 50 | 100,000 |

- Payment: **Razorpay** subscriptions only
- Enforcement: API returns `402` when trial expired / inactive
- UI: trial banner, usage meters in Settings, pricing page always reachable

---

## 8. UX & design principles

1. **Revenue over features** — Every screen answers "does this help close more deals?"
2. **Honest about Meta** — Never imply Growvisi replaces Business Agent in-chat replies
3. **WhatsApp-native language** — "Conversations" not "Tickets"; "Pipeline" not "Opportunities module"
4. **Progressive setup** — Explore first, connect WhatsApp when ready
5. **India-first** — ₹ pricing, en-IN number formatting, Razorpay copy
6. **Calm enterprise UI** — Lavender/mint dashboard (`surface-lavender`, accent green); grouped sidebar; sticky shell
7. **Mobile-aware** — Pipeline uses dropdown on small screens; sidebar drawer on mobile
8. **Realtime where it matters** — Inbox updates; don't over-poll analytics

### Copy sources (code)

- UI strings: `apps/web/src/lib/brand-copy.ts`
- Pricing display: `apps/web/src/lib/pricing-plans.ts`
- Plan limits: `packages/shared/src/billing.ts`

---

## 9. Technical constraints (product-relevant)

| Constraint | Product impact |
|------------|----------------|
| Vercel serverless API | Set `REDIS_URL` (Upstash/etc.) so BullMQ runs classify/inbound off-request; `USE_INLINE_WORKERS=1` forces inline for local debug |
| PostgreSQL + Prisma | Relational integrity for leads, messages, billing |
| Redis + BullMQ | Required for prod scale; optional locally (`redis://localhost:6379`) |
| Meta token lifecycle | Manual refresh in Settings v1; Home + global banner when token urgent |
| Meta App Review | Embedded Signup gated until approved |
| OPENAI_API_KEY optional | Graceful degrade: ingest works; classify off |

---

## 10. Success metrics

### 10.1 Activation (first 7 days)

| Metric | Target |
|--------|--------|
| WhatsApp connected | ≥ 60% of signups |
| First inbound message | ≥ 40% of connected |
| First AI classification | ≥ 30% of connected (when AI on) |
| Pipeline stage move (manual or AI) | ≥ 25% of leads |

### 10.2 Retention & revenue

| Metric | Target |
|--------|--------|
| Trial → paid conversion | ≥ 15% (early benchmark) |
| WAU / MAU | ≥ 50% |
| Churn (monthly) | &lt; 8% post-PMF |

### 10.3 Product quality

| Metric | Target |
|--------|--------|
| Webhook ingest success | ≥ 99.5% |
| Classify latency (p95) | &lt; 8s |
| API uptime | ≥ 99.9% |

---

## 11. Competitive positioning

**GTM framework:** See [`docs/GROWVISI-GTM.md`](./GROWVISI-GTM.md) — outcome tiers (Solo / Team / Operator), two-door GTM (SMB vs agency), activation north star, honest Meta boundary.

| Alternative | Growvisi advantage |
|-------------|------------------|
| WATI / Interakt / AiSensy | Revenue layer on WhatsApp — human Inbox, AI classify, pipeline ₹, team assign |
| Meta Business Agent alone | Pipeline, timeline, team, metrics, attribution |
| Intercom / Zendesk | WhatsApp-first, India pricing, no ticket bloat |
| HubSpot / Zoho CRM | 10× faster setup; built for WhatsApp sellers |
| spreadsheets | Real-time ingest, AI scoring, shared inbox |

---

## 12. Open decisions / backlog

| Topic | Decision needed |
|-------|-----------------|
| Growvisi-sent outbound at scale | Stay human-takeover only vs template API |
| pgvector RAG | Chunking strategy + embed on save |
| Outbound webhooks | Event schema for Pro |
| Mobile app | PWA first vs native (defer) |
| Hindi UI | Post-PMF if ICP demands |

---

## 13. Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **Conversation** | WhatsApp thread with one contact |
| **Lead** | Sales entity tied to phone; has stage, score, value |
| **Classification** | AI inference of stage, intent, sentiment |
| **Handoff** | Customer needs human; `requiresHuman` flag |
| **Business context** | Knowledge docs used in suggest-reply |
| **Entitlements** | Plan limits + trial access resolved server-side |

### B. Related docs

- [GTM framework (Solo / Team / Operator)](./GROWVISI-GTM.md)
- [Product narrative](./GROWVISI-PRODUCT-NARRATIVE.md)
- [System architecture](./architecture/01-system-overview.md)
- [AI orchestration](./architecture/03-ai-orchestration.md)
- [Deploy preflight](./DEPLOY-PREFLIGHT.md)

### C. Revision history

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jun 2026 | Initial PRD — MVP + full product definition |
