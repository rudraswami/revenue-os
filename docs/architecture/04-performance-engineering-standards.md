# Growvisi Performance Engineering Standards & Architecture Blueprint

**Version:** 1.0  
**Last updated:** July 2026  
**Owner:** Engineering  
**Status:** Mandatory engineering standard — applies to all features, fixes, and refactors  
**Audience:** Frontend, backend, infra, product, and reviewers  

**Related docs:**
- [01-system-overview.md](./01-system-overview.md)
- [02-event-and-queue-architecture.md](./02-event-and-queue-architecture.md)
- [03-ai-orchestration.md](./03-ai-orchestration.md)
- [AUTH-SESSION-RELIABILITY.md](../AUTH-SESSION-RELIABILITY.md)

---

## 0. Purpose

This document is the **engineering playbook** for Growvisi performance and responsiveness. It exists because individual page fixes do not solve platform-level slowness caused by:

- Duplicate network requests
- Uncached guard paths on every API call
- Broad cache invalidation
- Serverless inline processing of webhooks and AI
- Missing request budgets per route

**Goal:** Growvisi must feel **instant, smooth, predictable, and enterprise-grade** — comparable to Linear, Stripe, Slack, Notion, Intercom, HubSpot, and Vercel.

**Non-goal:** Micro-optimizing random components without measuring the full user journey.

---

## 1. Performance principles

These principles override convenience. When in doubt, choose the principle over the shortcut.

### 1.1 Perceived performance beats raw latency

Users forgive 400ms if the UI **acknowledges the action in &lt;100ms**. A spinner with no feedback for 2s feels broken even if the API is "fast enough."

**Rule:** Every mutation must show immediate acknowledgement (optimistic UI, pending state, or toast) before waiting for the server.

### 1.2 Fetch once, own the data

If data is already in the client cache from shell bootstrap or a parent route, **do not refetch it** on child mount unless explicitly invalidated.

**Rule:** One authoritative fetch per session scope. Children read from cache.

### 1.3 Request budgets are hard limits

Every route has a maximum number of network calls on mount. Exceeding the budget requires **written justification** in the PR (see §3).

**Rule:** No unbounded parallel `useQuery` sprawl.

### 1.4 Invalidate narrowly, patch aggressively

Prefer `queryClient.setQueryData` to update one row, one thread, or one counter. Use `invalidateQueries` only when the shape of data is unknown or multiple unrelated views must refresh.

**Rule:** Never invalidate `["conversations"]` when only one thread changed.

### 1.5 Background by default for expensive work

Classification, RAG, embeddings, campaign batch sends, digest emails, and webhook side effects **must not block** HTTP responses or user interactions.

**Rule:** Webhook ACK ≤ 300ms p95 — persist + enqueue only.

**Implementation status (P0-5):** WhatsApp `ingestWebhook` persists `webhookEvent`, then enqueues (worker host, 200ms cap) or `deferBackgroundTask` (Vercel / fallback). Never awaits `processInline` on the ACK path. Probe: `pnpm certify:webhook-ack`.

### 1.6 Serverless has a latency ceiling

Vercel API functions are not worker hosts. Long-running AI, campaign sends, and inbound webhook processing **must run on BullMQ workers** (dedicated host + Redis) in production.

**Rule:** `useBackgroundWorkers()` paths are the production standard; inline/`waitUntil` is fallback only.

### 1.7 Stale-while-revalidate everywhere

Show cached data immediately; refresh silently in the background. Full-page loaders are for **first visit only**, not tab switches.

**Rule:** `placeholderData: (prev) => prev` on all dashboard queries that survive navigation.

### 1.8 Measure before optimizing

No performance PR without evidence: request count, p95 latency, or bundle size delta. No `React.memo` dumps without profiler proof.

### 1.9 Premium loading preserves layout

Skeletons must match final layout dimensions. No layout shift when data arrives.

**Rule:** Use route `loading.tsx` + component skeletons from `@/components/ui/skeleton` and `GrowvisiSpinner` — never unstyled spinners.

### 1.10 Product honesty under load

If realtime is unavailable, say so in Connection settings. Do not silently fall back to 8s polling without the team knowing.

---

## 2. Request budgets per route

**Budget = max HTTP requests on cold mount** (after shell bootstrap completes).  
**Warm navigation** should be ≤ 2 requests (route-specific data only).

### 2.1 Global shell (every dashboard route)

| Request | Endpoint | Owner | Notes |
|---------|----------|-------|-------|
| 1 | `GET /organizations/shell-bootstrap` | `useDashboardShellBootstrap` | Seeds all caches below — **only fetch** |

**Shell bootstrap seeds (no separate fetch allowed):**

| Cache key (`QUERY_KEYS`) | Data |
|--------------------------|------|
| `authMe` | User, org, role |
| `billing` | Plan, entitlements, usage, friction |
| `whatsappAccounts` | Active numbers |
| `onboardingProgress` | Setup milestones |
| `conversationCapabilities` | AI flags |
| `agencyStatus` | Agency mode |
| `whatsappConnectionHealth` | Token health (conditional) |
| `paymentIntegration` | Razorpay webhook config (conditional) |

**Violations:** Any component that calls `/billing`, `/organizations/onboarding-progress`, `/whatsapp-accounts`, or `/agency/status` directly on mount without `placeholderData` from shell cache.

### 2.2 Route budgets

| Route | Cold budget | Warm budget | Allowed additional endpoints |
|-------|-------------|-------------|------------------------------|
| `/dashboard` (Home) | **≤ 6** | ≤ 2 | funnel, conversation stats, insights, team workload, SLA, revenue (metrics tier) |
| `/dashboard/inbox` | **≤ 3** | ≤ 1 | list + queue stats; thread loads on selection |
| `/dashboard/inbox?c=:id` | **≤ 4** | ≤ 2 | thread bundle (see §5.2) |
| `/dashboard/pipeline` | **≤ 2** | ≤ 1 | stage-grouped leads (must be paginated) |
| `/dashboard/contacts` | **≤ 3** | ≤ 1 | paginated contacts + tags |
| `/dashboard/tasks` | **≤ 2** | ≤ 1 | task list |
| `/dashboard/analytics` | **≤ 5** | ≤ 2 | funnel, revenue, SLA, attribution, lost/won |
| `/dashboard/campaigns` | **≤ 4** | ≤ 1 | campaigns list + reply metrics |
| `/dashboard/automations` | **≤ 3** | ≤ 1 | automations + intelligence settings |
| `/dashboard/settings` | **≤ 2** | ≤ 1 | tab-specific only (use `useSettingsBootstrap` pattern) |
| `/dashboard/pricing` | **≤ 1** | 0 | billing from shell cache |
| `/dashboard/agency` | **≤ 3** | ≤ 1 | clients + health summary |

### 2.3 Sidebar / global chrome

| Data | Source | Polling |
|------|--------|---------|
| Unread queue count | `GET /conversations/stats?scope=queue` | 30s max, only when realtime disconnected |
| Workspace switcher | shell `authMe` | Never poll |
| Nav badges | Derived from queue stats | Same as above |

**Rule:** Sidebar never fetches billing, onboarding, or full conversation stats.

### 2.4 Mutation budgets

| Action | Max follow-up requests | Pattern |
|--------|------------------------|---------|
| Send message | 0 required (optimistic) | Patch thread + list; optional confirm |
| Move pipeline stage | 0 required (optimistic) | Patch kanban columns |
| Save settings | 0 required | `setQueryData` on settings key |
| Connect WhatsApp | ≤ 2 | Invalidate shell bootstrap only |
| Checkout / billing | ≤ 1 | Poll billing status after Razorpay return |

### 2.5 Enforcement

- PRs that add `useQuery` must state which budget line they consume.
- CI check (future): lint rule counting `useQuery` per route file.
- Code review uses checklist in §11.

---

## 3. Data ownership rules

Every piece of dashboard data has **one owner**. Other components are **consumers**.

### 3.1 Ownership matrix

| Data domain | Owner hook / endpoint | Consumers | Consumer rule |
|-------------|----------------------|-----------|---------------|
| Session & org | `shell-bootstrap` → `authMe` | Sidebar, guards, settings | `cacheOnly` reads |
| Billing & entitlements | `shell-bootstrap` → `billing` | Pricing, banners, plan gates | Read cache; never own fetch |
| Onboarding progress | `shell-bootstrap` → `onboardingProgress` | Home banners, setup FAB | Read cache |
| WhatsApp accounts | `shell-bootstrap` → `whatsappAccounts` | Connection, campaigns, inbox | Read cache |
| Connection health | `shell-bootstrap` or dedicated refresh | Token expiry banner | Poll max 2min |
| Inbox list | `inbox/page` `useQuery` | — | Owns list key `["conversations", filter, scope]` |
| Open thread | `inbox/page` per `selectedId` | Timeline, compose | Single thread bundle query |
| Pipeline columns | `pipeline/page` | — | Owns `["pipeline"]` |
| Contacts page | `contacts/page` | Contact drawer | Owns paginated list |
| Analytics metrics | `analytics/page` | — | Owns period-scoped keys |
| Campaigns list | `campaigns/page` | Campaign drawer | Owns `["campaigns"]` |
| Settings tab data | Settings tab component | — | One fetch per tab, lazy on tab active |

### 3.2 Query key law

**All keys must use `QUERY_KEYS` from `apps/web/src/lib/query-config.ts`.**

Forbidden:
```typescript
useQuery({ queryKey: ["billing-status"], ... })  // ❌ use QUERY_KEYS.billing
```

### 3.3 Stale time law

| Tier | Constant | Duration | Applies to |
|------|----------|----------|------------|
| Live | `STALE.live` | 30s | Inbox list, queue stats |
| Dashboard | `STALE.dashboard` | 60s | Home cards, workload |
| Metrics | `STALE.metrics` | 120s | Funnel, revenue, SLA |
| Config | `STALE.config` | 300s | Tags, templates, settings |

**Same key → same staleTime everywhere.** No exceptions without ADR note in PR.

### 3.4 Derived state law

Do not store in Zustand what React Query already holds (billing, onboarding, leads).  
**Zustand owns:** auth tokens, hydration flag, UI preferences only.

### 3.5 Cross-tab consistency

Auth tokens sync via `BroadcastChannel` (see AUTH-SESSION-RELIABILITY).  
React Query cache is **per-tab** — realtime events patch cache; do not assume cross-tab RQ sync.

---

## 4. Caching policy

### 4.1 Cache tiers

```
┌─────────────────────────────────────────────────────────────┐
│ L0  Shell bootstrap (client memory, seeded once per session) │
├─────────────────────────────────────────────────────────────┤
│ L1  React Query (client, tiered staleTime)                   │
├─────────────────────────────────────────────────────────────┤
│ L2  Redis (server, guard + aggregate endpoints)              │
├─────────────────────────────────────────────────────────────┤
│ L3  PostgreSQL (source of truth)                             │
├─────────────────────────────────────────────────────────────┤
│ L4  CDN / browser (static assets, marketing pages only)      │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 What must be cached (server — Redis)

| Key pattern | TTL | Invalidation |
|-------------|-----|--------------|
| `entitlements:{orgId}` | 60s | Subscription webhook, plan change |
| `membership:{userId}:{orgId}` | 60s | Role change, invite accept |
| `shell-bootstrap:{orgId}` | 30s | WA connect, billing change, team change |
| `queue-stats:{orgId}` | 15s | Realtime `message.new` (or TTL expiry) |
| `onboarding:{orgId}` | 60s | First classify, WA connect, pipeline move |

**Implementation status (P0-4):** `entitlements:{orgId}` and `membership:{userId}:{orgId}` caches implemented.

**Implementation status (P1 shell-bootstrap):** `shell-bootstrap:{orgId}:{userId}` Redis cache (30s TTL) with org version bump invalidation on billing, team, and WA connect/disconnect. Probe: `pnpm certify:p1-performance`.

**Implementation status (P1 pipeline):** `GET /leads/pipeline` uses per-stage `take(limit+1)` queries instead of full-table scan. Indexes: `leads_org_stage_updated_at_idx` (migration `20260720140000`).

**Implementation status (P1 prefetch + code split):** Sidebar hover prefetches route data (`route-prefetch.ts`); Analytics `recharts` lazy-loaded via `next/dynamic`.

**Implementation status (P1 worker host):** `pnpm --filter @growvisi/api start:worker` with `WORKER_ONLY=1 USE_INLINE_WORKERS=0 REDIS_URL=...`. Vercel API never registers processors. Probe: `pnpm certify:worker-queue`, queue depths at `GET /health/queues`.

**Implementation status (P2 RUM):** `lib/rum.ts` observes LCP/INP/CLS; `useDashboardInteractivePerf` reports `dashboard.interactive`; `useRouteTransitionPerf` records `dashboard.route_transition`; Sentry browser tracing when `NEXT_PUBLIC_SENTRY_DSN` is set. Probe: `pnpm certify:p2-local`.

**Implementation status (P2 Redis HTTP cache):** `X-Growvisi-Cache: redis-hit|redis-miss` on shell-bootstrap and queue stats; global `Cache-Control: private, no-store` via `PrivateNoStoreInterceptor`. Server keys: `queue-stats:{orgId}:{userId}` (15s), `onboarding:{orgId}` (60s).

**Implementation status (P2 RSC bootstrap):** Dashboard `layout.tsx` server-fetches shell-bootstrap via refresh cookie; `ShellBootstrapInitialProvider` seeds React Query; settings hook shares `initialData`.

**Implementation status (P2 bundle CI):** `pnpm check:bundle-budget` parses Next First Load JS; CI warns on +10% over route budgets; baseline at `docs/certification/bundle-baseline.json`.

**Implementation status (TB-1):** `getThreadBundle` dedupes conversation + messages fetch (~5 parallel queries vs ~8+ legacy dual-call).

**Implementation status (TB-2):** `message.new` realtime patches list + open thread; scoped `refreshConversationLists` for bulk mutations only.

### 4.3 What must stay in React Query only

- Inbox threads and messages (high churn, user-specific)
- Pipeline board (optimistic patches)
- Compose drafts (local until send)
- Pagination cursors

### 4.4 What must never be refetched without cause

| Data | Refetch triggers |
|------|------------------|
| Shell bootstrap | WA connect/disconnect, billing webhook, explicit `invalidateQueries(shellBootstrap)` |
| Billing | Checkout return, cancel subscription, webhook |
| Tags / pipeline stages | CRUD on that entity |
| Templates list | Manual refresh button, post-Meta sync |

### 4.5 Invalidation registry

When adding `invalidateQueries`, register the trigger here:

| Event | Invalidate | Do NOT invalidate |
|-------|------------|-------------------|
| `message.new` (realtime) | Patch list item unread | All `["conversations"]` |
| Send message | Patch thread + list item | Funnel, billing |
| Stage change (optimistic) | Patch pipeline columns | All funnel periods |
| Stage change (settled) | `funnel(activePeriod)` only | Every period key |
| Handoff resolve | Patch thread metadata | Full inbox list |
| WA connect success | `shellBootstrap` | Individual banner keys |
| Team invite accepted | `shellBootstrap`, `teamMembers` | Everything |

### 4.6 `refetchOnWindowFocus`

| Query | Focus refetch |
|-------|---------------|
| Shell bootstrap | **Off** |
| Inbox list | Off (realtime + staleTime) |
| Billing after checkout | On (until ACTIVE) |
| Default | Off (global default) |

### 4.7 HTTP cache headers (API)

| Endpoint type | Cache-Control |
|---------------|---------------|
| Authenticated CRM | `private, no-store` |
| Public marketing help | `public, max-age=300` |
| Health check | `no-cache` |

---

## 5. Event architecture

Aligns with [02-event-and-queue-architecture.md](./02-event-and-queue-architecture.md). Performance rules below are additive.

### 5.1 Event delivery guarantees

| Path | Latency target | Mechanism |
|------|----------------|-----------|
| UI ← API mutation response | p95 &lt; 500ms | Optimistic + response body |
| UI ← realtime update | p95 &lt; 2s | Supabase Broadcast or Socket.IO |
| UI ← polling fallback | ≤ 30s | Only when realtime down |
| Webhook ← Meta ACK | p95 &lt; 300ms | Persist + enqueue |
| Classify complete → UI | p95 &lt; 15s | `lead.classified` event |

### 5.2 Realtime event → cache patch map

**File:** `apps/web/src/lib/realtime-event-handler.ts`

| Event | Required client action |
|-------|------------------------|
| `message.new` | `setQueryData` on list + thread if open; bump unread |
| `inbox.updated` | Invalidate queue stats only |
| `lead.classified` | Patch thread AI metadata if open |
| `lead.stage.changed` | Patch pipeline card + thread stage badge |
| `lead.handoff` | Patch thread handoff flag + queue stats |
| `whatsapp.setup.updated` | Invalidate `shellBootstrap` |

**Forbidden:** Blanket `invalidateQueries({ queryKey: ["conversations"] })` on every message.

### 5.3 Queue ownership

| Queue | Producer | Consumer | Max job time |
|-------|----------|----------|--------------|
| `whatsapp.inbound` | Webhook | Worker | 30s |
| `ai.classify` | Inbound processor | Worker | 120s |
| `ai.embed` | Knowledge upload | Worker | 300s |
| `campaign.send` | Campaign start | Worker | 600s (batched) |

### 5.4 Production worker requirement

```
VERCEL=1  →  enqueue + waitUntil (fallback only)
REDIS_URL + dedicated host  →  BullMQ workers (production standard)
```

Campaign sends and classify at scale **must not** rely on Vercel `waitUntil` alone.

### 5.5 API aggregation endpoints (canonical bundles)

| Bundle endpoint | Replaces | Status |
|-----------------|----------|--------|
| `GET /organizations/shell-bootstrap` | 6+ separate calls | ✅ Exists — enforce consumption |
| `GET /conversations/:id/thread` | getById + inbox-context (inbox open) | ✅ Inbox uses bundle; legacy `/inbox-context` for other consumers only |
| `GET /conversations/stats?scope=queue` | Full stats for sidebar | ✅ Exists — don't use full stats for badges |

---

## 6. AI pipeline standards

Aligns with [03-ai-orchestration.md](./03-ai-orchestration.md). Performance constraints below are mandatory.

### 6.1 Pipeline stages and blocking rules

```
Webhook receive
  → [BLOCK ≤300ms] persist message + ACK
  → [QUEUE] assign, lead create, attribution
  → [QUEUE] ai.classify

ai.classify job
  → [BLOCK in job] context build, RAG, classify LLM
  → [BLOCK in job] immediate actions: handoff, assign, reply.send (if policy allows)
  → [DEFER] CRM sync, memory, automations, post-close alert
  → [EMIT] lead.classified, inbox.updated
```

### 6.2 Timeout budgets

| Stage | Max timeout | On failure |
|-------|-------------|------------|
| Context build | 5s | Skip RAG, classify with transcript only |
| RAG retrieval | 8s | Empty context |
| Classify LLM | 25s | Retry queue (3×) |
| Compose LLM | 15s | No auto-send; handoff |
| Meta send | 15s | Retry; surface error in thread |
| Full classify job | 120s | Mark aiRun failed; alert |

### 6.3 Human-first product rule

Growvisi **classifies, scores, routes** — humans reply from Inbox unless `replyAutonomy: auto_guarded` and policy allows simple replies.

Performance implication: **suggest-reply is on-demand**, not on every message.

### 6.4 Fast path rules

Greeting/thanks/ack may use `fast-reply.service` without full LLM classify.

**Rule:** Fast path send must not block full classify — defer `runBackgroundClassifyOnly`.

### 6.5 Realtime consistency

Emit `lead.classified` **after** DB writes that UI depends on, or patch client optimistically on event receipt.

**Known gap:** `lead.stage.changed` may fire before deferred CRM sync — client must tolerate brief staleness or server must reorder emits.

### 6.6 Cost guards

- Dedup classify by `messageId` (1h window)
- `pg_advisory_xact_lock` per conversation turn
- Token metering per org (billing limits)
- No double LLM on fast path + background classify for same content without dedup

### 6.7 AI observability spans

All classify jobs must emit spans from `pipeline-spans.ts`:

`context_build_ms`, `rag_ms`, `classify_llm_ms`, `execute_plan_ms`, `fast_send_ms`, `deferred_crm_ms`

---

## 7. Observability requirements

### 7.1 What we must measure

| Layer | Signal | Tool |
|-------|--------|------|
| Frontend | LCP, INP, CLS, route transition time | Sentry / PostHog RUM |
| Frontend | React Query cache hit rate, fetch count per route | Custom dev overlay + prod sample |
| API | p50/p95/p99 per endpoint | Sentry APM / OpenTelemetry |
| API | Guard DB query count per request | Custom interceptor (dev) |
| DB | Slow query log &gt; 200ms | Prisma + Postgres |
| Queues | Job wait time, failure rate | BullMQ metrics |
| AI | Span timings per stage | `pipeline-spans` → logs/Sentry |
| Realtime | Connected vs polling mode | Client heartbeat event |
| Business | Time-to-first-classify, time-to-reply | Product analytics |

### 7.2 Required instrumentation (P1)

```typescript
// Every new endpoint
@SentrySpan() or OTel span with: orgId, endpoint, durationMs

// Every new useQuery on dashboard
// Document in PR: queryKey, staleTime, budget line from §2

// Every invalidateQueries
// Comment: trigger event + why narrow invalidation insufficient
```

### 7.3 Dashboards (minimum)

1. **API health** — error rate, p95 latency, cold start rate (Vercel)
2. **Inbox freshness** — webhook ACK time, classify job duration, realtime delivery lag
3. **Client perf** — route transition p95, bundle size trend
4. **Queue depth** — inbound, classify, campaign.send backlog

### 7.4 Alerting thresholds

| Alert | Condition |
|-------|-----------|
| Webhook ACK slow | p95 &gt; 500ms for 5min |
| Classify backlog | queue depth &gt; 100 for 10min |
| API error spike | 5xx &gt; 2% for 5min |
| Realtime down | &gt;50% clients on polling fallback for 1h |

### 7.5 Performance regression gate (CI — target P2)

- Bundle size budget per route (fail if +10% without approval)
- Lighthouse CI on dashboard shell (warn if TTI &gt; 4s)
- API integration test: shell-bootstrap p95 &lt; 400ms on staging

---

## 8. SLOs (Service Level Objectives)

### 8.1 User-facing SLOs

| Interaction | p75 | p95 | Measurement |
|-------------|-----|-----|-------------|
| Login → dashboard interactive | 1.0s | 2.0s | RUM: first input after shell visible |
| Dashboard route change (warm) | 150ms | 300ms | Click → meaningful content |
| Dashboard route change (cold) | 800ms | 1.5s | Click → skeleton → content |
| Open conversation (thread visible) | 400ms | 800ms | Click → messages rendered |
| Send message (perceived) | 50ms | 100ms | Optimistic bubble |
| Send message (confirmed) | 1.5s | 3.0s | Meta ACK |
| Pipeline drag (perceived) | 50ms | 100ms | Card position update |
| Settings save acknowledgement | 100ms | 200ms | UI feedback |
| AI classify visible in thread | 5s | 15s | Intent badge appears |
| Inbound message in inbox | 2s | 5s | List updates |

### 8.2 API SLOs

| Endpoint class | p95 |
|----------------|-----|
| `shell-bootstrap` | 400ms |
| Inbox list (page 1) | 300ms |
| Thread bundle (slim) | 250ms |
| Mutations (send, stage, settings) | 500ms |
| Analytics aggregates | 800ms |
| Webhook ACK (WhatsApp) | 300ms |

### 8.3 Availability SLOs

| Service | Target |
|---------|--------|
| API (authenticated) | 99.9% monthly |
| Webhook ingestion | 99.95% (Meta retry tolerance) |
| Realtime delivery | 99% within 2s (when configured) |

### 8.4 Error budget policy

If API error budget burns &gt;50% in a month:

1. Freeze non-P0 features
2. Performance/fix sprint
3. Postmortem with request budget violations listed

---

## 9. Definition of Done (Performance)

A feature is **not done** unless all applicable items pass.

### 9.1 All features

- [ ] Request budget documented (§2) — does not exceed route limit
- [ ] Uses `QUERY_KEYS` and correct `STALE.*` tier
- [ ] Does not fetch data owned by shell bootstrap
- [ ] Mutations acknowledge user action in &lt;100ms
- [ ] Loading state uses layout-matched skeleton or branded spinner
- [ ] No new `refetchOnWindowFocus: true` without approval
- [ ] No new polling without `useVisibleRefetchInterval`
- [ ] `invalidateQueries` scope documented; narrowest possible
- [ ] Tested on throttled 4G (Chrome DevTools) — no blocking blank screens

### 9.2 Dashboard / data features

- [ ] `placeholderData: (prev) => prev` on revisited queries
- [ ] Realtime handler patches cache where applicable
- [ ] Pagination for lists expected to exceed 100 rows

### 9.3 API features

- [ ] No N+1 Prisma queries (verified in review)
- [ ] Guard path does not add &gt;2 new DB queries without cache plan
- [ ] Response payload sized — no unbounded includes
- [ ] Expensive work queued, not awaited in HTTP handler

### 9.4 AI features

- [ ] Classify/send not blocking webhook ACK
- [ ] Timeouts per §6.2
- [ ] Spans emitted
- [ ] Human-first policy preserved in UI copy

### 9.5 Infrastructure

- [ ] Works on Vercel fallback path (degraded but functional)
- [ ] Production worker path tested if job enqueued

---

## 10. Performance code review checklist

Copy into every performance-sensitive PR.

### 10.1 Frontend

```
[ ] How many useQuery hooks does this route add? (budget: §2)
[ ] Does this data already exist in shell bootstrap cache?
[ ] queryKey uses QUERY_KEYS constant?
[ ] staleTime matches tier for this data type?
[ ] placeholderData preserves previous on navigation?
[ ] Mutation has optimistic update OR instant pending UI?
[ ] invalidateQueries scope — list all keys and justify each
[ ] Polling interval — is useVisibleRefetchInterval used?
[ ] Large dependency imported — should it be next/dynamic?
[ ] Does loading skeleton match final layout?
```

### 10.2 Backend

```
[ ] How many Prisma queries per request? (target ≤5 for reads)
[ ] Any full-table scan or unbounded findMany?
[ ] JSON path filters — indexed or cached?
[ ] Can this merge into an existing bundle endpoint?
[ ] Is work deferred to queue vs awaited in controller?
[ ] Response size estimate — pagination needed?
[ ] Entitlements/membership — cacheable?
[ ] New endpoint added to observability spans?
```

### 10.3 AI / realtime

```
[ ] Webhook handler returns before classify completes?
[ ] Classify job timeout and retry configured?
[ ] Realtime event patches client cache vs broad invalidate?
[ ] Fast path does not double-charge LLM without dedup?
[ ] UI reflects in-flight classify state?
```

### 10.4 Red flags (auto-request-changes)

- New `useQuery` for `/billing` or `/onboarding-progress` on mount
- `invalidateQueries({ queryKey: ["conversations"] })` without thread scope
- `findMany` without `take`/`where` on leads or messages
- `await` OpenAI or Meta in webhook controller
- `refetchInterval` &lt; 5s without visibility hook
- Full-page loader for data already in cache
- Raw query key strings bypassing `QUERY_KEYS`

---

## 11. Implementation roadmap (reference)

This standard defines **what**. Execution order from platform audit:

| Phase | Focus | Outcome |
|-------|-------|---------|
| **P0** | Shell cache contract, narrow invalidation, thread bundle API, entitlements cache, webhook fast ACK | Dashboard stops double-loading |
| **P1** | Pipeline pagination, code splitting, prefetch, worker host, DB indexes | Scale + navigation speed |
| **P2** | RUM, bundle CI, RSC bootstrap, Redis HTTP cache | Sustained enterprise grade |

Do not skip P0 for page-level polish.

---

## 12. Governance

### 12.1 Document updates

- Changes to SLOs, request budgets, or cache tiers require PR to this file + engineering review.
- New routes must add a row to §2.2 before ship.

### 12.2 Exceptions

Exceptions require:

1. Issue link with user/business impact
2. Time-bounded exception (max 2 sprints)
3. Removal task in backlog

### 12.3 Ownership

| Area | Owner |
|------|-------|
| This document | Engineering lead |
| QUERY_KEYS / STALE tiers | Frontend platform |
| Shell bootstrap API | Backend platform |
| Queue/worker infra | Infra |
| AI pipeline timeouts | AI platform |
| SLO dashboards | DevOps |

---

## 13. Quick reference card

```
┌──────────────────────────────────────────────────────────────┐
│  GROWVISI PERFORMANCE — QUICK RULES                         │
├──────────────────────────────────────────────────────────────┤
│  1. Shell bootstrap seeds cache — don't refetch children     │
│  2. Every route has a request budget                         │
│  3. Patch cache > invalidate                                 │
│  4. Mutations feel instant (<100ms feedback)                 │
│  5. Webhook ACK <300ms — queue the rest                      │
│  6. AI runs in workers in production                          │
│  7. QUERY_KEYS + STALE tiers are law                         │
│  8. Measure before memoizing                                 │
│  9. Skeletons match layout                                   │
│  10. If it's slow, check request count first                 │
└──────────────────────────────────────────────────────────────┘
```

---

*This document supersedes ad-hoc performance guidance. When it conflicts with older docs, this file wins for performance and responsiveness standards.*
