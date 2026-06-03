# Production environment variables

## Important: `.env` vs Vercel

| File / place | Used when |
|--------------|-----------|
| **`c:\Users\DELL\revenue-os\.env`** | Only when you run **`pnpm dev` on your PC** |
| **Vercel → Project → Settings → Environment Variables** | When users hit your **live** API and web |

Vercel **never reads** your local `.env` file.  
Localhost values in `.env` are **correct for local dev**.

You need **two Vercel projects** with **different** variables:

1. **revenue-os-api** (`apps/api`) — backend  
2. **revenue-os-web** (`apps/web`) — frontend  

---

## 1) Vercel API project (`revenue-os-api`)

**Required** (production will not work without these):

```env
DATABASE_URL=postgresql://postgres.qzeiggsgnruvxbvdesfd:YOUR_PASSWORD@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.qzeiggsgnruvxbvdesfd:YOUR_PASSWORD@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres
REDIS_URL=rediss://default:XXXX@XXXX.upstash.io:6379
JWT_SECRET=your-production-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://YOUR-WEB-DOMAIN.vercel.app
CORS_ORIGINS=https://YOUR-WEB-DOMAIN.vercel.app
WEBHOOK_PUBLIC_URL=https://YOUR-API-DOMAIN.vercel.app
WHATSAPP_VERIFY_TOKEN=revenue-os-webhook-verify
WHATSAPP_API_VERSION=v21.0
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_EMBEDDED_SIGNUP_CONFIG_ID=your_config_id
WHATSAPP_APP_SECRET=your_meta_app_secret
```

**Do NOT put on API project:**

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `NEXT_PUBLIC_META_APP_ID` (only on web — see below)
- `SEED_*`
- `API_URL=http://localhost:4000`

**Replace:**

- `YOUR_PASSWORD` — Supabase DB password (URL-encoded `@` as `%40`)
- `REDIS_URL` — from [Upstash](https://console.upstash.com) (not `127.0.0.1`)
- `YOUR-API-DOMAIN` — e.g. `revenue-os-api.vercel.app`
- `YOUR-WEB-DOMAIN` — e.g. `revenue-os-web.vercel.app`
- Meta values — from Meta Developer → Revenue OS app

**Meta webhook callback (paste in Meta dashboard, not env):**

```text
https://YOUR-API-DOMAIN.vercel.app/api/v1/webhooks/whatsapp
```

---

## 2) Vercel Web project (`revenue-os-web`)

**Required:**

```env
NEXT_PUBLIC_API_URL=https://YOUR-API-DOMAIN.vercel.app/api/v1
NEXT_PUBLIC_WS_URL=wss://YOUR-API-DOMAIN.vercel.app
NEXT_PUBLIC_APP_URL=https://YOUR-WEB-DOMAIN.vercel.app
NEXT_PUBLIC_META_APP_ID=your_meta_app_id
NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID=your_config_id
```

**Do NOT put on Web project:**

- `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`, `META_APP_SECRET`, etc.

---

## 3) Local `.env` (your PC only)

Keep **localhost** for running API + web locally:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
REDIS_URL=redis://127.0.0.1:6379
NODE_ENV=development
```

You can still use **Supabase** `DATABASE_URL` / `DIRECT_URL` locally (same as production DB).

**Optional:** point local web at **production API** (API on Vercel, web on laptop):

```env
NEXT_PUBLIC_API_URL=https://YOUR-API-DOMAIN.vercel.app/api/v1
NEXT_PUBLIC_WS_URL=wss://YOUR-API-DOMAIN.vercel.app
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Checklist before going live

- [ ] API health: `https://YOUR-API-DOMAIN.vercel.app/api/v1/health` → `ok`
- [ ] `REDIS_URL` on Vercel API is **Upstash** (`rediss://...`), not localhost
- [ ] Meta webhook verified with same `WHATSAPP_VERIFY_TOKEN`
- [ ] Web `NEXT_PUBLIC_*` URLs use **https** / **wss**, not localhost
- [ ] Redeploy **both** projects after changing env vars

---

## Copy-paste templates

- API: `docs/vercel-api.env.example`
- Web: `docs/vercel-web.env.example`
