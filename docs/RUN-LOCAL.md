# Run Revenue OS locally (your Supabase project)

Project: **revenue-os** · `qzeiggsgnruvxbvdesfd` · Sydney (`ap-southeast-2`)

## Security

You shared your DB password in chat. After setup works, rotate it:

**Supabase → Project Settings → Database → Reset database password**, then update `.env`.

Never commit `.env` to GitHub.

---

## Step 1 — `.env` is already configured

`C:\Users\DELL\revenue-os\.env` contains your Supabase URLs (password is URL-encoded).

---

## Step 2 — Enable pgvector (pick one)

**A) SQL Editor (easiest)**

1. Supabase Dashboard → **SQL Editor**
2. Paste and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
```

**B) CLI**

```powershell
cd C:\Users\DELL\revenue-os
pnpm exec supabase link --project-ref qzeiggsgnruvxbvdesfd
pnpm supabase:push
```

---

## Step 3 — Create tables + demo user

```powershell
cd C:\Users\DELL\revenue-os
pnpm db:push
pnpm db:seed
```

---

## Step 4 — Redis

**Option A — local (already in repo)**

```powershell
# setup-local.ps1 starts Redis from .local\redis automatically
```

**Option B — Upstash (recommended for production)**

1. https://console.upstash.com → create DB → copy `rediss://...`
2. Set `REDIS_URL` in `.env`

---

## Step 5 — Run

```powershell
pnpm setup:local   # link + migrations + seed (one shot)
pnpm dev
```

| | |
|---|---|
| App | http://localhost:3000 |
| API | http://localhost:4000/api/v1/health |
| Login | `demo@revenue-os.local` / `demo123456` (email + password only) |

---

## WhatsApp

After register/login, complete **Onboarding** → **Continue with Facebook**. Production deploy: **[DEPLOY-PRODUCTION.md](./DEPLOY-PRODUCTION.md)**

Meta setup: **[META-EMBEDDED-SIGNUP.md](./META-EMBEDDED-SIGNUP.md)** · **[WHATSAPP-SETUP.md](./WHATSAPP-SETUP.md)**

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Can't reach database server` | Check internet; run `supabase link` first; use SQL Editor for vector |
| `IPv6 is not supported` | `pnpm exec supabase link --project-ref qzeiggsgnruvxbvdesfd` |
| API won't start | Set `REDIS_URL` and start Redis or Upstash |
| Login fails | Run `pnpm db:seed` again |
