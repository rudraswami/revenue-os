# Pre-deploy checklist — Growvisi (Vercel)

Run this **before** pushing WhatsApp onboarding + token reminder changes to production.

## Vercel projects

| Project | Root | Production URL |
|---------|------|----------------|
| `revenue-os-api` | `apps/api` | https://api.growvisi.in |
| `revenue-os-web` | `apps/web` | https://www.growvisi.in |

---

## 1. API env vars (revenue-os-api)

**Sync all production vars from local `.env` files:**

```bash
pnpm vercel:env:production
```

This sets domain URLs, `LATENCY_PROBE_ENABLED=false`, AI models, Meta/WhatsApp keys from `.env`, removes `SEED_*` from production, and skips empty secrets (keeps existing Vercel values for `REDIS_URL`, `JWT_SECRET`, `TOKEN_ENCRYPTION_KEY` if not in local `.env`).

### Required on production ✓

| Variable | Status |
|----------|--------|
| `DATABASE_URL` / `DIRECT_URL` | ✓ |
| `REDIS_URL` | ✓ |
| `JWT_SECRET` | ✓ |
| `META_APP_ID` / `META_APP_SECRET` | ✓ |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | ✓ |
| `WHATSAPP_VERIFY_TOKEN` | ✓ |
| `WHATSAPP_APP_SECRET` | ✓ |
| `WHATSAPP_API_VERSION` | ✓ |
| `WEBHOOK_PUBLIC_URL` | ✓ (see fix below) |
| `CORS_ORIGINS` / `NEXT_PUBLIC_APP_URL` | ✓ |
| `RESEND_API_KEY` / `EMAIL_FROM` | ✓ |
| **`EMAIL_VERIFICATION_REQUIRED`** | Set to `true` when deploying email identity (or run `pnpm vercel:env:domain`) |
| `OPENAI_API_KEY` / AI vars | ✓ |
| **`LATENCY_PROBE_ENABLED`** | `false` (set by `pnpm vercel:env:production`) |
| **`COOKIE_DOMAIN`** | `.growvisi.in` |
| **`CRON_SECRET`** | ✓ (cron auth) |
| **`TOKEN_ENCRYPTION_KEY`** | ✓ |

### Add manually when ready

| Variable | Why |
|----------|-----|
| **`SENTRY_DSN`** | Error tracking — create project at sentry.io, add to `.env`, re-run `pnpm vercel:env:production` |
| **`NEXT_PUBLIC_SENTRY_DSN`** | Same DSN on web project |
| **`RAZORPAY_*`** | Paid upgrades — `pnpm vercel:env:razorpay` after adding keys to `.env` |

### Removed from production (security)

| Variable | Why |
|----------|-----|
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` / `SEED_ORG_NAME` | Never belong on production |

### Previously listed as missing — now addressed

### Fix in Vercel dashboard

| Variable | Issue |
|----------|--------|
| **`WEBHOOK_PUBLIC_URL`** | Must be exactly `https://api.growvisi.in` — **edit in Vercel UI** (Settings → Environment Variables). Windows `vercel env add` via PowerShell often stores a literal `\r\n` inside the value, which breaks webhook URLs until code with `sanitizeEnvValue` is deployed. |
| **`WHATSAPP_VERIFY_TOKEN`** | Same — re-paste in dashboard with no trailing newline. Webhook GET verify already sanitizes in code; URL building is fixed in latest local `whatsapp-accounts.service.ts`. |

### Optional

| Variable | Default |
|----------|---------|
| `WHATSAPP_EMBEDDED_SIGNUP_LIVE` | `true` (set `false` only to hide one-click connect) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` (code default) |

---

## 2. Web env vars (revenue-os-web)

All required vars are set ✓:

- `NEXT_PUBLIC_API_URL` → `https://api.growvisi.in/api/v1`
- `NEXT_PUBLIC_WS_URL` → `wss://api.growvisi.in`
- `NEXT_PUBLIC_APP_URL` → `https://www.growvisi.in`
- `NEXT_PUBLIC_META_APP_ID`
- `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID`

### Production realtime (Supabase Broadcast)

Socket.IO is disabled on Vercel serverless. For live inbox updates without polling:

| Variable | Project | Value |
|----------|---------|-------|
| `SUPABASE_URL` | API | Same as database project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | API | Service role key (server only) |
| `NEXT_PUBLIC_SUPABASE_URL` | Web | Same Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web | Anon key (public) |

Optional: set `NEXT_PUBLIC_REALTIME_ENABLED=true` to force realtime on; `false` to disable.

For native WebSocket (local dev or dedicated API host), point `NEXT_PUBLIC_WS_URL` at a non-Vercel API and omit Supabase vars.

---

## 3. vercel.json (API)

Local `apps/api/vercel.json` includes cron — **not live until code is deployed**:

```json
{
  "crons": [{
    "path": "/api/v1/internal/cron/whatsapp-token-reminders",
    "schedule": "0 */6 * * *"
  }]
}
```

**Note:** Vercel **Hobby** allows one cron per day — `apps/api/vercel.json` uses `0 9 * * *` (09:00 UTC). For every-6-hour reminders, upgrade API project to **Pro** and set schedule to `0 */6 * * *`.

### Async queues on Vercel (AI + inbound)

| Runtime | Behavior |
|---------|----------|
| **Local / Docker** | BullMQ + Redis (`REDIS_URL`) — `AI_CLASSIFY` and `WHATSAPP_INBOUND` jobs run in background workers when `useBackgroundWorkers()` is true. |
| **Vercel + `REDIS_URL`** | Jobs enqueue to Upstash Redis; processors run in the same serverless invocation via `waitUntil` (no long-lived workers). **REDIS_URL is required in production** — API refuses to start without it. |
| **Vercel without Redis** | **Blocked in production** — env validation fails at startup. |
| **Debug** | `USE_INLINE_WORKERS=1` forces inline processing even with Redis. |

Ensure `REDIS_URL` is set on production API (Upstash `rediss://...`). Also required: `CRON_SECRET` (Vercel Cron auth) and `COOKIE_DOMAIN=.growvisi.in` (refresh cookie across subdomains).

---

## 4. Code not on production yet

Local changes (uncommitted) include:

- `GET /whatsapp-accounts/onboarding-readiness` → **404 on prod today**
- `POST /whatsapp-accounts/quick-connect` → **not on prod**
- `POST /whatsapp-accounts/:id/refresh-token` → **not on prod**
- `GET /internal/cron/whatsapp-token-reminders` → **404 on prod today**
- New onboarding wizard UI, token banners, `/dashboard/connect` redirect

**Production build verified locally:** `pnpm turbo run build --filter=@growvisi/api --filter=@growvisi/web` passes.

---

## 5. Meta (developers.facebook.com)

Confirm for app **1694805491426991**:

- [ ] Webhook callback: `https://api.growvisi.in/api/v1/webhooks/whatsapp`
- [ ] Verify token matches `WHATSAPP_VERIFY_TOKEN` on API
- [ ] Subscribed fields: `messages` (and related)
- [ ] OAuth redirect / allowed domains include `growvisi.in`

---

## 6. Post-deploy smoke test

```powershell
# Health
curl.exe -s https://api.growvisi.in/api/v1/health

# Login (meta reviewer)
$body = '{"email":"meta.reviewer@growvisi.in","password":"MetaReview2026!Growvisi"}'
$r = Invoke-RestMethod -Uri "https://api.growvisi.in/api/v1/auth/login" -Method POST -ContentType "application/json" -Body $body
$h = @{ Authorization = "Bearer $($r.accessToken)" }

# New endpoints (after deploy)
Invoke-RestMethod -Uri "https://api.growvisi.in/api/v1/whatsapp-accounts/onboarding-readiness" -Headers $h
Invoke-RestMethod -Uri "https://api.growvisi.in/api/v1/whatsapp-accounts/connection-health" -Headers $h

# Cron (after CRON_SECRET set)
curl.exe -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://api.growvisi.in/api/v1/internal/cron/whatsapp-token-reminders
```

### Browser E2E

1. https://www.growvisi.in/login → meta reviewer
2. https://www.growvisi.in/onboarding → 3-step wizard
3. Paste Meta API Setup token → discover phones → **Connect automatically**
4. Send test WhatsApp from personal phone → ingestion verifier turns green
5. Dashboard → Conversations shows thread
6. Settings → **Refresh token** UI visible when token nears expiry

---

## 7. Deploy order

1. **Apply DB migration** (before API deploy): `pnpm db:email-verification-migrate` or `pnpm supabase:push`
2. Add `EMAIL_VERIFICATION_REQUIRED=true` on API project (included in `pnpm vercel:env:domain`)
3. Add `CRON_SECRET` on API project
4. Re-save `WEBHOOK_PUBLIC_URL` (trim newline)
5. Commit + push to `main` (triggers Vercel deploy)
6. Verify API deploy → run smoke tests above
7. Verify web deploy → register → check-email → verify link flow
8. Test one real WhatsApp connect on meta-review-demo workspace

See also: [WHATSAPP-ONBOARDING.md](./WHATSAPP-ONBOARDING.md)
