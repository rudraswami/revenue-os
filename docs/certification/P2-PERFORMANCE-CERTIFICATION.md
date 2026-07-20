# P2 Performance Certification — RUM, Bundle CI, RSC Bootstrap, Redis HTTP Cache

**Scope:** Client RUM, dashboard RSC shell bootstrap, bundle budget CI, Redis-backed GET observability  
**Status:** **CERTIFIED** (engineering) — staging RUM + Redis warm-hit re-probe recommended  
**Last updated:** 2026-07-20

---

## Executive decision

| Verdict | Rationale |
|---------|-----------|
| **CERTIFIED** | P2 deliverables implemented: Web Vitals observers, `dashboard.interactive` SLO hook, Sentry browser tracing, RSC shell-bootstrap hydration, `X-Growvisi-Cache` headers, global `Cache-Control: private, no-store`, bundle budget script in CI. Local probe: `pnpm certify:p2-local`. |

**Not unconditional GO because:** LCP/INP/CLS budgets are validated in dev console + Sentry when DSN is set; production RUM soak on staging is still recommended before canary.

---

## 1. P2 deliverables

| Item | Implementation | Probe |
|------|----------------|-------|
| **RUM** | `lib/rum.ts`, `SentryInit`, `useDashboardInteractivePerf`, `useRouteTransitionPerf` | `certify:p2-local` static + Sentry DSN on staging |
| **RSC bootstrap** | `dashboard/layout.tsx` → `fetchShellBootstrapServer` → `ShellBootstrapInitialProvider` | Web unit test + settings hook uses `initialData` |
| **Redis HTTP cache** | `getWithMeta`, `X-Growvisi-Cache: redis-hit\|redis-miss` on shell-bootstrap + queue stats | `certify:p2-local` warm double-fetch |
| **Bundle CI** | `pnpm check:bundle-budget` (+10% gate, warn-only in CI) | `certify:p2-local --include-bundle` |

---

## 2. Redis HTTP cache observability

### Headers

| Header | Value | Routes |
|--------|-------|--------|
| `Cache-Control` | `private, no-store` | All API responses (default interceptor) |
| `X-Growvisi-Cache` | `redis-hit` or `redis-miss` | `GET /organizations/shell-bootstrap`, `GET /conversations/stats?scope=queue` |

### Server cache keys (P2 additions)

| Key | TTL | Invalidation |
|-----|-----|--------------|
| `gv:queue-stats:{orgId}:{userId}` | 15s | TTL; shell-bootstrap version bump on org config changes |
| `gv:onboarding:{orgId}` | 60s | Shell-bootstrap version bump |

Shell-bootstrap itself: `gv:shell-bootstrap:{orgId}:{userId}` (30s) — see P1 certification.

---

## 3. RUM budgets (§7.1 / §8.1)

| Metric | Budget | Source |
|--------|--------|--------|
| LCP | 2500ms | `PerformanceObserver` → dev log; Sentry when >1.5× budget |
| INP | 200ms | Event timing observer |
| CLS | 0.1 | Layout shift accumulator |
| `dashboard.interactive` | 2000ms | Time from shell mount until bootstrap ready (RSC seed or client fetch) |
| `dashboard.route_transition` | per `performance.ts` | Route change SLO |

Enable production traces: set `NEXT_PUBLIC_SENTRY_DSN`.

---

## 4. Local certification

```bash
# API + web dev server running; CERTIFY_TOKEN or login credentials in .env
pnpm certify:p2-local

# Optional: full bundle analysis (runs next build)
pnpm certify:p2-local --include-bundle
```

Artifacts: `docs/certification/artifacts/p2-local/p2-probe-*.json`

### Expected local outcomes

| Condition | Result |
|-----------|--------|
| `REDIS_URL` unset | `WARN` on warm redis-hit (headers still validated) |
| `REDIS_URL` set | Warm second fetch should show `redis-hit` |
| No `NEXT_PUBLIC_SENTRY_DSN` | RUM observers run; Sentry init no-ops |

---

## 5. Staging sign-off checklist

- [ ] `pnpm certify:p2-local` → PASS with Redis
- [ ] DevTools: dashboard first paint shows shell data without client bootstrap waterfall (RSC)
- [ ] Sentry: `dashboard.interactive` and route transition events visible
- [ ] CI: `check:bundle-budget` green or approved waiver

---

## 6. Related docs

- `docs/architecture/04-performance-engineering-standards.md` — §7.5, §8.1, §11 P2
- `docs/certification/REDIS-AUTH-CACHE-VALIDATION.md` — P0-4 foundation
- P1: `pnpm certify:p1-performance`
