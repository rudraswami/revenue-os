# GrowthSync domain setup (growthsync.in)

Code is rebranded to **GrowthSync**. Point DNS and Vercel to your domain.

## Recommended DNS layout

| Host | Points to | Purpose |
|------|-----------|---------|
| `growthsync.in` | Vercel (web project) | App UI |
| `www.growthsync.in` | Redirect → `growthsync.in` | Optional |
| `api.growthsync.in` | Vercel (API project) | REST + webhooks |

## Vercel — Web project

1. Project **growthsync-web** (or rename from revenue-os-web) → **Settings → Domains**
2. Add `growthsync.in` and `www.growthsync.in`
3. **Environment variables** (Production):

```env
NEXT_PUBLIC_APP_URL=https://growthsync.in
NEXT_PUBLIC_API_URL=https://api.growthsync.in/api/v1
NEXT_PUBLIC_WS_URL=wss://api.growthsync.in
```

4. Redeploy web

## Vercel — API project

1. Project **growthsync-api** → **Settings → Domains** → add `api.growthsync.in`
2. **Environment variables**:

```env
NEXT_PUBLIC_APP_URL=https://growthsync.in
CORS_ORIGINS=https://growthsync.in,https://www.growthsync.in
WEBHOOK_PUBLIC_URL=https://api.growthsync.in
```

3. Redeploy API

## Meta (Facebook Login for Business)

**Allowed domains:** `growthsync.in`, `www.growthsync.in`, `localhost`

**Valid OAuth Redirect URIs:**

```
https://growthsync.in/
https://www.growthsync.in/
http://localhost:3000/
```

**WhatsApp webhook callback:** `https://api.growthsync.in/api/v1/webhooks/whatsapp`

## Local folder (optional)

Rename repo folder `revenue-os` → `growthsync` on your machine. Git remote can stay the same.

## Demo login (after seed)

- Email: `demo@growthsync.in`
- Password: `demo123456`

Session cookie renamed to `growthsync-session` — users must sign in again after deploy.
