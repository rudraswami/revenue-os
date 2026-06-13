# Growvisi on Vercel (growvisi.com)

## Live URLs

| Service | URL |
|---------|-----|
| **Web** | https://growvisi.com |
| **Register** | https://growvisi.com/register |
| **Login** | https://growvisi.com/login |
| **API health** | https://api.growvisi.com/api/v1/health |
| **WhatsApp webhook** | https://api.growvisi.com/api/v1/webhooks/whatsapp |

## Environment variables (Production)

### Web project (`revenue-os-web` / `apps/web`)

```env
NEXT_PUBLIC_APP_URL=https://growvisi.com
NEXT_PUBLIC_API_URL=https://api.growvisi.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.growvisi.com
```

### API project (`revenue-os-api` / `apps/api`)

```env
NEXT_PUBLIC_APP_URL=https://growvisi.com
CORS_ORIGINS=https://growvisi.com,https://www.growvisi.com
WEBHOOK_PUBLIC_URL=https://api.growvisi.com
```

Do **not** set `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_WS_URL` on the API project.

## Update env from CLI

```powershell
node scripts/set-vercel-growvisi-env.js
```

Then **redeploy web** (required for `NEXT_PUBLIC_*` to bake into Next.js build).

## Meta dashboard

- **Allowed domains:** `growvisi.com`, `www.growvisi.com`, `localhost`
- **OAuth redirect URIs:** `https://growvisi.com/`, `https://www.growvisi.com/`, `http://localhost:3000/`

See `docs/GROWVISI-DOMAIN.md` and `docs/PRODUCTION-ENV.md`.
