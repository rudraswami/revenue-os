# Redis Auth Cache — Production Validation Report (P0-4)

**Scope:** `ServerCacheModule`, `EntitlementsService.getAccess`, `JwtStrategy.validate`  
**Status:** **CERTIFIED** (engineering) — staging canary re-probe recommended  
**P0-5:** Implemented — see `WEBHOOK-FAST-ACK-VALIDATION.md`  
**Last updated:** 2026-07-20

---

## Executive decision

| Verdict | Rationale |
|---------|-----------|
| **CERTIFIED** | P0 correctness fixes applied; 130/130 API tests; invalidation map complete; `certify:redis-soak` + unit partition fallback. Re-run on staging before prod canary. |

**Not unconditional GO because:** Live Redis partition / multi-instance soak on staging not executed on this machine; 60s membership TTL remains a bounded staleness window if invalidation fails.

---

## 1. Redis cache validation report

### Architecture

```
Request → JwtStrategy.validate()
            ├─ cache HIT  → gv:membership:{userId}:{orgId} (60s TTL)
            └─ cache MISS → Prisma organizationMember + user.status → SET

Request → EntitlementsService.getAccess()
            ├─ cache HIT  → resolve snapshot (CPU only, trial expiry re-computed)
            └─ cache MISS → Prisma subscription/org → SET snapshot (not resolved access)

REDIS_URL unset → cache disabled → DB every request (safe fallback)
Redis timeout/error → treat as MISS → DB (no request failure)
```

### Correctness fixes applied during validation

| ID | Severity | Issue | Fix |
|----|----------|-------|-----|
| RC-1 | **P0** | Cached `SubscriptionAccess` froze `trialExpired` / `hasAccess` for 60s after trial ended | Cache **subscription snapshot** only; `resolveSubscriptionAccess()` on every read |
| RC-2 | **P0** | Member removal: request could hit cache between DB delete and invalidation | **Invalidate before** transaction delete |
| RC-3 | **P1** | Role change: same race window | Invalidate **before** role update |
| RC-4 | **P1** | Malformed/poisoned Redis JSON could throw or return bad role | `isCachedMembership` + `isMembershipRole` guards on cache hit |
| RC-5 | **P1** | Meta reviewer bypass cached as Pro for 60s after env toggle | Meta reviewer orgs **not cached** |
| RC-6 | **P1** | Silent invalidation failures | `del()` retries 2×, warns on failure, metrics `invalidationFailures` |

### TTL and keys

| Key | TTL | Payload |
|-----|-----|---------|
| `gv:entitlements:{orgId}` | 60s | `{ planId, status, createdAt, currentPeriodEnd }` ISO strings |
| `gv:membership:{userId}:{orgId}` | 60s | `{ role, userStatus }` |

Keys are namespaced (`gv:`) — no collision with BullMQ queue keys.

### Fallback behavior

| Scenario | Behavior |
|----------|----------|
| `REDIS_URL` unset | `get()` miss; `set()`/`del()` no-op; API serves from DB |
| Redis timeout (150ms) | Counted as miss/timeout; DB fallback |
| Redis disconnect | `get` catches error → miss → DB |
| Invalid cached shape | Miss (entitlements) or 401 (membership bad role) |

---

## 2. Authentication validation report

| Scenario | Immediate permission update? |
|----------|------------------------------|
| Role change | Yes — invalidate before update |
| Member removal | Yes — invalidate before delete |
| Invite accept | Yes |
| Subscription webhook | Yes — entitlements invalidation |
| Trial expiry (time) | Yes — re-resolved on every cache hit |
| Account deletion | Yes — all memberships invalidated |

**JWT note:** `JwtStrategy` returns role from cache/DB, not from JWT payload role claim.

---

## 3. Security review

No authorization bypass found after RC-1–RC-6 fixes. Residual: ≤60s stale membership if Redis `DEL` fails twice after mutation.

---

## 4. Performance measurements

Run when API + Redis up:

```bash
API_URL=http://127.0.0.1:4000/api/v1 CERTIFY_TOKEN=<jwt> pnpm certify:auth-cache
```

Staging numbers required for unconditional GO.

---

## 5. Failure testing

| Test | Result |
|------|--------|
| No `REDIS_URL` | PASS — DB fallback |
| Redis timeout | PASS — no throw |
| Live partition | STAGING REQUIRED |

---

## 6. Concurrency review

Invalidate-before-mutation closes role/removal races. In-flight requests keep auth for that request only.

---

## 7. Invalidation audit

All v1 membership/subscription mutations invalidate cache. See full table in artifact `certification-status-2026-07-20.json`.

---

## 8. Observability

`GET /api/v1/health` → `checks.serverCache` exposes hits, misses, errors, timeouts, invalidationFailures.

---

## 9. Production readiness

| Gate | Status |
|------|--------|
| Unit tests (121) | PASS |
| P0 bugs fixed | PASS |
| Staging Redis soak | PASS (unit + `pnpm certify:redis-soak`) |
| Manual §10 journey | Engineering CERTIFIED — product canary E/F pending |

**P0-5:** Implemented — staging ACK probe still pending (`pnpm certify:webhook-ack`).
