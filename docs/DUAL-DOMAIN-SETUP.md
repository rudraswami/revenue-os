# Dual domain setup — growvisi.in + growvisi.com

Run **growvisi.in** (production today) and **growvisi.com** (parallel) on the same Vercel projects without breaking webhooks, Meta, or existing users.

## Architecture

| Role | `.in` (primary) | `.com` (parallel) |
|------|-----------------|-------------------|
| Web | `www.growvisi.in` | `www.growvisi.com` |
| API | `api.growvisi.in` | `api.growvisi.com` |
| Auth cookie | `.growvisi.in` | `.growvisi.com` |
| Meta WhatsApp webhook | `api.growvisi.in` only | — (do not move) |
| Razorpay webhook | `api.growvisi.in` only | — (do not move) |

**Same codebase, same database, same Vercel deployments.** The app picks API host and cookie domain from the browser hostname at runtime.

## What stays on `.in` (do not change)

These are integration endpoints — changing them breaks production for all customers:

- `WEBHOOK_PUBLIC_URL` → `https://api.growvisi.in`
- `QSTASH_CALLBACK_URL` → `https://api.growvisi.in`
- Meta WhatsApp callback → `https://api.growvisi.in/api/v1/webhooks/whatsapp`
- Razorpay webhook → `https://api.growvisi.in/api/v1/webhooks/razorpay`
- `NEXT_PUBLIC_APP_URL` on API → `https://www.growvisi.in` (email links, embedded signup default)

## Rollout checklist (safe order)

### 1. Deploy code (this PR)

- Host-aware API URL on web (`.com` → `api.growvisi.com`, `.in` → `api.growvisi.in`)
- Request-aware auth cookies on API (Origin-based `.growvisi.in` / `.growvisi.com`)
- CORS regex already allows both TLDs; env should list all four web origins

**No production impact until DNS is added** — `.in` behaviour is unchanged.

### 2. Vercel — add domains (additive)

**Web project** (`revenue-os-web` / `apps/web`):

1. Settings → Domains → Add:
   - `growvisi.com` (redirect to `www.growvisi.com`)
   - `www.growvisi.com`
2. Keep existing `growvisi.in` / `www.growvisi.in` as-is.

**API project** (`revenue-os-api` / `apps/api`):

1. Add:
   - `api.growvisi.com`
2. Keep `api.growvisi.in` as primary.

### 3. DNS (at your registrar)

For **growvisi.com**:

| Name | Type | Value |
|------|------|-------|
| `@` | A | Vercel apex IPs (from Vercel domain UI) |
| `www` | CNAME | `cname.vercel-dns.com` |
| `api` | CNAME | `cname.vercel-dns.com` |

Do **not** change `growvisi.in` DNS.

### 4. Vercel env — extend CORS only

On **API** production, update (additive):

```env
CORS_ORIGINS=https://growvisi.in,https://www.growvisi.in,https://growvisi.com,https://www.growvisi.com
```

Keep unchanged:

```env
COOKIE_DOMAIN=.growvisi.in
WEBHOOK_PUBLIC_URL=https://api.growvisi.in
NEXT_PUBLIC_APP_URL=https://www.growvisi.in
```

Or run from repo root:

```bash
node scripts/fix-vercel-auth-env.js
```

Web env vars can stay on `.in` defaults — runtime host detection handles `.com`.

### 5. Meta dashboard — add (do not remove `.in`)

| Location | Add |
|----------|-----|
| App domains | `growvisi.com`, `www.growvisi.com` |
| Facebook Login → Valid OAuth Redirect URIs | `https://www.growvisi.com/`, `https://growvisi.com/` |
| Facebook Login → Allowed Domains | `growvisi.com`, `www.growvisi.com` |

**Do not change** WhatsApp webhook callback URL (stays `api.growvisi.in`).

### 6. Verify

```bash
# .in unchanged
curl -s https://api.growvisi.in/api/v1/health | jq .status

# .com API alias (after DNS)
curl -s https://api.growvisi.com/api/v1/health | jq .status

# CORS preflight from .com
curl -s -X OPTIONS https://api.growvisi.in/api/v1/health \
  -H "Origin: https://www.growvisi.com" \
  -H "Access-Control-Request-Method: GET" -D - -o /dev/null | grep -i access-control
```

Manual smoke:

1. Open `https://www.growvisi.in` → login → dashboard (regression)
2. Open `https://www.growvisi.com` → register or login → dashboard
3. DevTools → Network: API calls go to `api.growvisi.com` on `.com`
4. WhatsApp Embedded Signup on `.com` (after Meta domains added)

## Optional: canonical redirect

If you want **one** public URL for SEO/bookmarks, add a Vercel redirect on web:

- `www.growvisi.com` → `www.growvisi.in` (301)

Only do this if you do **not** want users on `.com`. For parallel access, skip this step.

## Optional: make `.com` primary later

1. Update `NEXT_PUBLIC_APP_URL` on API to `https://www.growvisi.com`
2. Update email templates / legal copy
3. 301 `www.growvisi.in` → `www.growvisi.com` when ready
4. Meta App Review URLs — update gradually

Webhooks can remain on `api.growvisi.in` indefinitely (same backend).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login works on `.in` but not `.com` | Add `api.growvisi.com` on API Vercel project + DNS; extend `CORS_ORIGINS` |
| FB Login "Feature Unavailable" on `.com` | Add `.com` domains + OAuth redirect URIs in Meta |
| Session drops on reload on `.com` | Confirm `api.growvisi.com` is live; check refresh cookie domain in DevTools → Application → Cookies |
| WhatsApp inbound stopped | You changed webhook URL — revert to `api.growvisi.in` |
