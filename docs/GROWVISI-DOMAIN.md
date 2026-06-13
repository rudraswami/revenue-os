# Growvisi domain setup (growvisi.com)

Code is rebranded to **Growvisi**. Point DNS and Vercel to your domain.

## Recommended DNS layout

| Host | Points to | Purpose |
|------|-----------|---------|
| `growvisi.com` | Vercel (web project) | Redirects to **www** |
| `www.growvisi.com` | Vercel (web project) | **Primary app URL** (use this in Meta) |
| `api.growvisi.com` | Vercel (API project) | REST + webhooks |

## Vercel — Web project

1. Project **growvisi-web** (or rename from revenue-os-web) → **Settings → Domains**
2. Add `growvisi.com` and `www.growvisi.com`
3. **Environment variables** (Production):

```env
NEXT_PUBLIC_APP_URL=https://www.growvisi.com
NEXT_PUBLIC_API_URL=https://api.growvisi.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.growvisi.com
```

4. Redeploy web

## Vercel — API project

1. Project **growvisi-api** → **Settings → Domains** → add `api.growvisi.com`
2. **Environment variables**:

```env
NEXT_PUBLIC_APP_URL=https://www.growvisi.com
CORS_ORIGINS=https://growvisi.com,https://www.growvisi.com
WEBHOOK_PUBLIC_URL=https://api.growvisi.com
```

3. Redeploy API

## Meta (Facebook Login for Business)

**Allowed domains:** `growvisi.com`, `www.growvisi.com`, `localhost`

**Valid OAuth Redirect URIs:**

```
https://growvisi.com/
https://www.growvisi.com/
http://localhost:3000/
```

**WhatsApp webhook callback:** `https://api.growvisi.com/api/v1/webhooks/whatsapp`

## Local folder (optional)

Rename repo folder `revenue-os` → `growvisi` on your machine. Git remote can stay the same.

## Demo login (after seed)

- Email: `demo@growvisi.com`
- Password: `demo123456`

Session cookie renamed to `growvisi-session` — users must sign in again after deploy.

## Refresh Vercel env from CLI

```powershell
node scripts/set-vercel-growvisi-env.js
# or: pnpm vercel:env:domain
```

Then redeploy **web** (required) and **API**:

```powershell
cd apps/web; vercel redeploy https://growvisi.com
cd apps/api; vercel redeploy https://api.growvisi.com
```
