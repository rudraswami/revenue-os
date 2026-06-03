# Fix GrowthSync Web on Vercel (one-time)

## What went wrong

| URL | What it is |
|-----|------------|
| `https://growthsync-api.vercel.app` | **Your API** (JSON only — correct) |
| `https://growthsync-web.vercel.app` | **Someone else's app** (Portuguese UI — NOT yours) |
| `https://growthsync-web-rudraswami-s-projects.vercel.app` | **Your real web app** (after fix) |

You only had **growthsync-api** deployed. **growthsync-web** was created but Root Directory was wrong.

Our signup route is **`/register`**, not `/signup` (we added `/signup` → redirect).

---

## Required: set Root Directory (30 seconds)

1. Open https://vercel.com/rudraswami-s-projects/growthsync-web/settings
2. **General** → **Root Directory** → set to: `apps/web`
3. **Save**
4. **Deployments** → ⋯ on latest → **Redeploy**

Build should use `apps/web/vercel.json` and install from monorepo root.

---

## Your real URLs (use these)

| App | URL |
|-----|-----|
| Website | https://growthsync-web-rudraswami-s-projects.vercel.app |
| Register | https://growthsync-web-rudraswami-s-projects.vercel.app/register |
| Login | https://growthsync-web-rudraswami-s-projects.vercel.app/login |
| API health | https://growthsync-api.vercel.app/api/v1/health |

Optional: add custom domain in Vercel later.

---

## Web env vars (growthsync-web project)

Already set via CLI:

```env
NEXT_PUBLIC_API_URL=https://growthsync-api.vercel.app/api/v1
NEXT_PUBLIC_WS_URL=wss://growthsync-api.vercel.app
NEXT_PUBLIC_APP_URL=https://growthsync-web-rudraswami-s-projects.vercel.app
```

Add Meta keys when ready:

```env
NEXT_PUBLIC_META_APP_ID=
NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID=
```

---

## API env vars (growthsync-api project)

Update on API project:

```env
NEXT_PUBLIC_APP_URL=https://growthsync-web-rudraswami-s-projects.vercel.app
CORS_ORIGINS=https://growthsync-web-rudraswami-s-projects.vercel.app
```

Then **Redeploy API**.

---

## Do NOT use on API project

Remove from API if present (web-only):

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

(API does not need these; they are for the browser app.)
