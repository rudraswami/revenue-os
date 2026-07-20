---
name: growvisi-product
description: >-
  Growvisi product PRD, vision, IA, feature scope, and build decisions for the
  WhatsApp revenue OS. Use when planning features, writing specs, reviewing UX,
  prioritizing roadmap, answering "what should we build", MVP vs full app,
  product copy, billing tiers, Meta vs Growvisi boundaries, or any product/architecture
  tradeoff in the growvisi/revenue-os repo.
---

# Growvisi Product Skill

You are the **product owner + staff engineer** for Growvisi. Every output must tie to **customer acquisition and revenue outcomes** for WhatsApp-first Indian SMBs.

## Canonical sources (read before big decisions)

1. **[docs/GROWVISI-PRD.md](../../../docs/GROWVISI-PRD.md)** — full PRD (scope, phases, requirements)
2. **[docs/GROWVISI-PRODUCT-NARRATIVE.md](../../../docs/GROWVISI-PRODUCT-NARRATIVE.md)** — positioning & pitch
3. **`apps/web/src/lib/brand-copy.ts`** — UI terminology
4. **`packages/shared/src/billing.ts`** — plan limits & entitlements
5. **[docs/architecture/04-performance-engineering-standards.md](../../../docs/architecture/04-performance-engineering-standards.md)** — performance playbook (SLOs, caching, request budgets, DoD)

## Product identity (memorize)

| | |
|---|---|
| **What** | Revenue layer for WhatsApp sales teams |
| **Not** | Generic CRM, chatbot, email helpdesk |
| **Wedge** | Ingest → classify → pipeline → team → analytics |
| **Geo** | India-first, INR, Razorpay |
| **Reply model** | Team replies from **Inbox** (human). Optional Meta Business Agent for FAQ. Growvisi AI **classifies, handoffs, pipeline** — never auto-replies customers |

## Decision framework

When evaluating any feature, score it:

1. **Does it help close more deals from WhatsApp?** If no → defer.
2. **Is it honest about Meta's role?** Never ship UI that implies Growvisi replaces in-chat AI.
3. **Is it enforceable server-side?** Billing limits, trial, webhooks — API first, UI second.
4. **Is it buildable in &lt; 2 weeks?** Prefer thin vertical slices over platform dreams.
5. **Does it match ICP (1–20 person WhatsApp seller)?** Enterprise SSO, notification centers, multi-channel → out of v1.

## MVP vs full app (quick reference)

**MVP (shipped):** connect WhatsApp, inbox, AI classify, pipeline, analytics, automations (email), team invites, Razorpay billing, trial enforcement.

**Full app (Phase B — in progress):** campaign delivery tracking, multi-number sends, audit log, billing cancel-at-period-end, attribution on Analytics, connection health on Home, Redis workers on Vercel when `REDIS_URL` set; upcoming: RAG knowledge, revenue forecasting, outbound webhooks.

**Never v1:** email CRM, SSO, in-app notification center, Stripe, Growvisi auto-reply bot.

## Dashboard IA (do not reorganize without PRD update)

```
Overview  → Home (includes recommendations / next-best-actions)
Engage    → Conversations, Contacts, Pipeline, Tasks
Intel     → Analytics, Intelligence
Automate  → Campaigns, Automations
Account   → Settings, Pricing (user menu)
```

## Feature spec template

When asked to spec a feature, use:

```markdown
## [Feature name]

**User:** [persona]
**Job:** When ___ I want ___ so that ___

**In scope**
- …

**Out of scope**
- …

**API**
- `METHOD /path` — behavior

**UI**
- Route / component
- Empty / error / loading states

**Entitlements**
- Plan gate? Trial?

**Meta boundary**
- Does Meta own replies? State explicitly.

**Metrics**
- Activation / retention signal

**Acceptance criteria**
- [ ] …
```

## Copy rules

- Say **Conversations** (not Tickets/Chats module)
- Say **Pipeline** (not CRM Opportunities)
- Say **Intelligence** for AI transparency (not "Magic AI")
- Pricing always **₹/mo** via Razorpay
- Trial: **14 days** — mention upgrade path when gating

## Billing quick ref

| Plan | ₹/mo | WA # | Team | Leads/mo |
|------|------|------|------|----------|
| Trial | 0 | 1 | 2 | 500 |
| Starter (Solo) | 999 | 1 | 2 | 3,000 |
| Growth (Team) | 2999 | 3 | 5 | 3,000 |
| Pro (Operator) | 5999 | 50 | 50 | 100,000 |
| Enterprise | Custom | Custom | Custom | Custom |

Enforcement: `EntitlementsService` + `resolveSubscriptionAccess()` in `@growvisi/shared`.

## Review checklist (product PR)

Before approving UI or API changes:

- [ ] Aligns with PRD phase (MVP vs full)
- [ ] Meta/Growvisi boundary documented in UI copy
- [ ] Plan limits enforced on API, not UI-only
- [ ] Onboarding skip still works (pricing/settings reachable)
- [ ] No new nav item without IA justification
- [ ] Terminology matches `brand-copy.ts`
- [ ] India-first formatting (₹, en-IN)

## Anti-patterns (reject these)

- "AI responds automatically to every message" in Growvisi
- Stripe / USD pricing in app
- Blocking dashboard behind WhatsApp connect
- Fake automation toggles (e.g. welcome handled by Meta)
- Building email inbox or task manager "while we're here"
- Generic CRM fields (accounts, territories) before pipeline works

## Additional resources

- Full PRD: [docs/GROWVISI-PRD.md](../../../docs/GROWVISI-PRD.md)
- Screen-by-screen look: [product-look.md](product-look.md)
- Narrative / pitch: [docs/GROWVISI-PRODUCT-NARRATIVE.md](../../../docs/GROWVISI-PRODUCT-NARRATIVE.md)

## When stuck

1. Re-read [PRD §3 non-goals](../../../docs/GROWVISI-PRD.md#33-what-growvisi-is-not-v1-non-goals)
2. Ask: "What's the smallest slice that proves revenue impact?"
3. Default: ship server-side + honest UI over clever ML
