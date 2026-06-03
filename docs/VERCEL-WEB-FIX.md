# GrowthSync on Vercel (growthsync.in)

## Live URLs

| Service | URL |
|---------|-----|
| **Web** | https://growthsync.in |
| **Register** | https://growthsync.in/register |
| **Login** | https://growthsync.in/login |
| **API health** | https://api.growthsync.in/api/v1/health |
| **WhatsApp webhook** | https://api.growthsync.in/api/v1/webhooks/whatsapp |

## Environment variables (Production)

### Web project (`revenue-os-web` / `apps/web`)

```env
NEXT_PUBLIC_APP_URL=https://growthsync.in
NEXT_PUBLIC_API_URL=https://api.growthsync.in/api/v1
NEXT_PUBLIC_WS_URL=wss://api.growthsync.in
```

### API project (`revenue-os-api` / `apps/api`)

```env
NEXT_PUBLIC_APP_URL=https://growthsync.in
CORS_ORIGINS=https://growthsync.in,https://www.growthsync.in
WEBHOOK_PUBLIC_URL=https://api.growthsync.in
```

Do **not** set `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_WS_URL` on the API project.

## Update env from CLI

```powershell
node scripts/set-vercel-growthsync-env.js
```

Then **redeploy web** (required for `NEXT_PUBLIC_*` to bake into Next.js build).

## Meta dashboard

- **Allowed domains:** `growthsync.in`, `www.growthsync.in`, `localhost`
- **OAuth redirect URIs:** `https://growthsync.in/`, `https://www.growthsync.in/`, `http://localhost:3000/`

See `docs/GROWTHSYNC-DOMAIN.md` and `docs/PRODUCTION-ENV.md`.
