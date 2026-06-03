# Supabase setup (GrowthSync)

GrowthSync uses:

| Service | Provider | Purpose |
|---------|----------|---------|
| **PostgreSQL** | Supabase | All app data (Prisma) |
| **pgvector** | Supabase extension | AI knowledge embeddings |
| **Redis** | Upstash (free) | BullMQ job queues |

Auth is **our own JWT** (NestJS), not Supabase Auth — Supabase is the database host only.

---

## 1. Create Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → choose region close to users
3. Save the **database password**

---

## 2. Connection strings

**Project Settings → Database → Connection string**

| Variable | Type | Port |
|----------|------|------|
| `DATABASE_URL` | **Transaction pooler** (PgBouncer) | 6543 |
| `DIRECT_URL` | **Direct connection** | 5432 |

Paste both into `.env` at the repo root.

---

## 3. CLI workflow (from repo root)

```powershell
cd C:\Users\DELL\growthsync
pnpm install

# Interactive setup
pnpm setup:supabase

# Or step by step:
pnpm supabase:login
pnpm supabase:link          # pick your project
pnpm supabase:push          # SQL: pgvector extension
pnpm db:push                # Prisma: all tables
pnpm db:seed                # demo user + org
```

---

## 4. Upstash Redis (required for API)

1. [console.upstash.com](https://console.upstash.com) → **Create database**
2. Copy **Redis URL** (`rediss://...`)
3. Add to `.env` as `REDIS_URL`

Without Redis, the API will not start (WhatsApp webhook queues).

---

## 5. Run the app

```powershell
pnpm dev
```

| URL | |
|-----|---|
| Web | http://localhost:3000 |
| API | http://localhost:4000/api/v1/health |

**Demo login** (after seed):

- Email: `demo@growthsync.in`
- Password: `demo123456`
- Org slug: `demo-company`

---

## 6. Useful CLI commands

```powershell
pnpm supabase:status        # linked project info
pnpm supabase:types         # generate TypeScript types from DB
pnpm db:studio              # Prisma Studio (browse data)
pnpm db:migrate             # create new Prisma migration (dev)
pnpm db:deploy              # apply migrations (production)
```

---

## Architecture note

```
Supabase CLI (supabase/migrations)  →  extensions (vector)
Prisma (packages/database)          →  application schema + seed
NestJS API                          →  DATABASE_URL (pooled)
Prisma CLI (migrate/push)           →  DIRECT_URL (direct)
```

Do not edit tables manually in Supabase SQL editor unless you sync back to Prisma.
