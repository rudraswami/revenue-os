# Quick start — Supabase (no Docker)

## Prerequisites

- Node 20+ and pnpm
- Free [Supabase](https://supabase.com) project
- Free [Upstash](https://upstash.com) Redis database

## One-time setup

```powershell
cd C:\Users\DELL\growvisi
cp .env.example .env
# Fill DATABASE_URL, DIRECT_URL, REDIS_URL in .env (see docs/SUPABASE.md)

pnpm install
pnpm setup:supabase
```

## Run

```powershell
pnpm dev
```

- **Web:** http://localhost:3000  
- **API:** http://localhost:4000/api/v1/health  

**Login:** `demo@growvisi.com` / `demo123456` (org slug: `demo-company`) after `pnpm db:seed`

Full details: [docs/SUPABASE.md](./docs/SUPABASE.md)
