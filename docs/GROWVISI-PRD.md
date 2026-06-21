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

| Area | Requirements | Priority |
|------|--------------|----------|
| WhatsApp | Embedded Signup live (post App Review), multi-number at scale | P0 |
| Intelligence | pgvector RAG in classify + suggest; conversation summaries | P1 |
| Pipeline | Won/lost reasons, revenue forecasting, cohort views | P1 |
| Automations | Outbound webhooks, richer audit log | P2 |
| Integrations | API keys + read API; Shopify/Razorpay payment events | P2 |
| Ops | Always-on workers (not Vercel inline), Sentry, usage dashboards | P1 |
| Billing | Self-serve portal, invoices, usage overage | P2 |

### Phase C — Expansion (post-PMF)

- Multi-location / franchise workspaces
- WhatsApp template campaigns (where Meta policy allows)
- Partner/tech-provider tooling
- Enterprise tier (SLA, dedicated support) — still no SSO unless demanded

---

## 6. Information architecture (dashboard)

### 6.1 Navigation groups

| Group | Routes | Purpose |
|-------|--------|---------|
| **Overview** | `/dashboard` | Health, getting started, key metrics |
| **Engage** | `/dashboard/inbox`, `/dashboard/pipeline` | Day-to-day sales work |
| **Intelligence** | `/dashboard/analytics`, `/dashboard/ai`, `/dashboard/insights` | Performance + AI transparency |
| **Automate** | `/dashboard/automations` | Server-side workflows (email, stage rules) |
| **Account** | Settings, Pricing (user menu) | Workspace, billing, WhatsApp, profile |

### 6.2 Page responsibilities

| Page | User job | Must show | Must NOT |
|------|----------|-----------|----------|
| **Home** | "Is everything working?" | Setup progress, WhatsApp status, quick metrics | Long marketing copy |
| **Conversations** | "What did customers say?" | Thread, timeline, assign, AI toggle | Promise Growvisi auto-replies |
| **Pipeline** | "Where are deals?" | Kanban, score, deal value, hot badges | Email-style CRM fields |
| **Analytics** | "How are we performing?" | Funnel, period filters | Vanity charts without actions |
| **Intelligence** | "What does AI do?" | Capabilities, classification explainers | Black-box AI claims |
| **Insights** | "What should I do?" | Stalled leads, handoffs, recommendations | Generic AI essays |
| **Automations** | "What runs automatically?" | Honest server-side toggles | Fake toggles for Meta-owned behavior |
| **Settings** | "Configure workspace" | WhatsApp, team, billing, context, API keys | Legal walls in nav |
| **Pricing** | "Upgrade plan" | INR plans, trial status, Razorpay checkout | Stripe / USD |

### 6.3 Onboarding flow

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
| Vercel serverless API | AI/webhook jobs run inline at MVP volume; document scale path |
| PostgreSQL + Prisma | Relational integrity for leads, messages, billing |
| Redis + BullMQ (local) | Background classify when not on Vercel |
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

| Alternative | Growvisi advantage |
|-------------|------------------|
| Meta Business Agent alone | Pipeline, timeline, team, metrics |
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

- [Product narrative](./GROWVISI-PRODUCT-NARRATIVE.md)
- [System architecture](./architecture/01-system-overview.md)
- [AI orchestration](./architecture/03-ai-orchestration.md)
- [Deploy preflight](./DEPLOY-PREFLIGHT.md)

### C. Revision history

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jun 2026 | Initial PRD — MVP + full product definition |
