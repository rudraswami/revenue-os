# Pre-deploy checklist — Growvisi (Vercel)

Run this **before** pushing WhatsApp onboarding + token reminder changes to production.

## Vercel projects

| Project | Root | Production URL |
|---------|------|----------------|
| `revenue-os-api` | `apps/api` | https://api.growvisi.in |
| `revenue-os-web` | `apps/web` | https://www.growvisi.in |

---

## 1. API env vars (revenue-os-api)

### Already set on production ✓

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
| `OPENAI_API_KEY` / AI vars | ✓ |

### Missing — add before deploy ✗

| Variable | Why |
|----------|-----|
| **`CRON_SECRET`** | Required for `/api/v1/internal/cron/whatsapp-token-reminders` (token reminder emails). Generate: `openssl rand -base64 32` |

### Fix in Vercel dashboard

| Variable | Issue |
|----------|--------|
| **`WEBHOOK_PUBLIC_URL`** | Must be exactly `https://api.growvisi.in` — **edit in Vercel UI** (Settings → Environment Variables). Windows `vercel env add` via PowerShell often stores a literal `\r\n` inside the value, which breaks webhook URLs until code with `sanitizeEnvValue` is deployed. |
| **`WHATSAPP_VERIFY_TOKEN`** | Same — re-paste in dashboard with no trailing newline. Webhook GET verify already sanitizes in code; URL building is fixed in latest local `whatsapp-accounts.service.ts`. |

### Optional

| Variable | Default |
|----------|---------|
| `WHATSAPP_EMBEDDED_SIGNUP_LIVE` | `false` until Meta App Review |
| `JWT_ACCESS_EXPIRES_IN` | `15m` (code default) |

---

## 2. Web env vars (revenue-os-web)

All required vars are set ✓:

- `NEXT_PUBLIC_API_URL` → `https://api.growvisi.in/api/v1`
- `NEXT_PUBLIC_WS_URL` → `wss://api.growvisi.in`
- `NEXT_PUBLIC_APP_URL` → `https://www.growvisi.in`
- `NEXT_PUBLIC_META_APP_ID`
- `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID`

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

1. Add `CRON_SECRET` on API project
2. Re-save `WEBHOOK_PUBLIC_URL` (trim newline)
3. Commit + push to `main` (triggers Vercel deploy)
4. Verify API deploy → run smoke tests above
5. Verify web deploy → onboarding wizard loads
6. Test one real WhatsApp connect on meta-review-demo workspace

See also: [WHATSAPP-ONBOARDING.md](./WHATSAPP-ONBOARDING.md)
