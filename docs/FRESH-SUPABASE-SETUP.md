# Fresh Supabase setup (new project)

Use this when you **lost access** to the old Supabase project or want a clean database.

**Warning:** A new Supabase project starts **empty**. You will **not** recover:

- Existing user accounts / passwords
- WhatsApp connections (Meta tokens)
- Leads, conversations, pipeline history
- Razorpay subscription links tied to the old DB

Plan to **re-register**, **re-connect WhatsApp**, and **re-seed** demo/review accounts.

---

## 1. Create Supabase project

1. Sign up / log in at [supabase.com/dashboard](https://supabase.com/dashboard) (new account is fine).
2. **New project** → name e.g. `growvisi-prod`
3. **Region:** pick closest to India users (e.g. Mumbai `ap-south-1` or Sydney if that was your old region).
4. **Save the database password** — you need it for connection strings.

---

## 2. Copy connection strings

**Project Settings → Database → Connection string**

| Variable | Supabase UI option | Port |
|----------|-------------------|------|
| `DATABASE_URL` | **Transaction pooler** (PgBouncer) | 6543 |
| `DIRECT_URL` | **Direct connection** | 5432 |

Add `?pgbouncer=true` to the pooler URL if Supabase does not include it.

Also copy from **Settings → API** (optional, for future Supabase features):

- `SUPABASE_PROJECT_ID` (project ref, e.g. `abcdefghijklmnop`)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Local `.env`

At repo root, create or replace `.env`:

```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

SUPABASE_PROJECT_ID=[PROJECT_REF]
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Keep your existing Redis + JWT + Meta vars from Vercel or .env.example
REDIS_URL=rediss://...
JWT_SECRET=...
```

Use the same `JWT_SECRET` as production Vercel if you want existing cookies to keep working (otherwise all users must log in again anyway on empty DB).

---

## 4. Bootstrap the full schema (one command)

From repo root:

```bash
export PATH="$HOME/.local/node/bin:$PATH"
cd ~/Documents/revenue-os
pnpm install
pnpm db:setup-fresh -- --seed
```

This will:

1. Enable **pgvector** (`extensions` schema)
2. Run **`prisma db push`** — creates **all 33 application tables** from `packages/database/prisma/schema.prisma`
3. Verify every table exists (including `email_verification_tokens`)
4. Optionally seed:
   - `demo@growvisi.com` / `demo123456`
   - `meta.reviewer@growvisi.in` / `MetaReview2026!Growvisi`

**Do not** run `supabase/migrations/*.sql` manually on a blank database — those files are incremental patches for the old project. Fresh installs use Prisma only.

---

## 5. Update Vercel (production API)

**Project:** `revenue-os-api` → Settings → Environment Variables

Update for **Production** (and Preview if you use it):

| Variable | Action |
|----------|--------|
| `DATABASE_URL` | Replace with new pooler URL |
| `DIRECT_URL` | Replace with new direct URL |
| `EMAIL_VERIFICATION_REQUIRED` | `true` |
| `RESEND_API_KEY` | Keep existing |
| `EMAIL_FROM` | Keep existing |

Then **Redeploy** the API (Deployments → … → Redeploy).

Web project (`revenue-os-web`) does **not** need DB URLs.

CLI alternative:

```bash
cd apps/api
vercel env rm DATABASE_URL production --yes
printf 'YOUR_NEW_POOLER_URL' | vercel env add DATABASE_URL production
vercel env rm DIRECT_URL production --yes
printf 'YOUR_NEW_DIRECT_URL' | vercel env add DIRECT_URL production
```

---

## 6. Smoke tests

```bash
# API health
curl https://api.growvisi.in/api/v1/health

# Verify-email should return 401 + code (not 500)
curl -s -X POST https://api.growvisi.in/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}'
```

Expected: `{"statusCode":401,"message":"...","code":"INVALID_VERIFICATION_TOKEN"}`

Then in browser:

1. Register a new account → check verification email
2. Verify → dashboard, no banner
3. Settings → profile save → banner stays hidden

---

## 7. Link Supabase CLI (optional)

```bash
pnpm supabase:login
pnpm exec supabase link --project-ref YOUR_PROJECT_REF
pnpm supabase:status
```

---

## What gets created (complete list)

All tables from current Prisma schema:

`users`, `refresh_tokens`, `password_reset_tokens`, `email_verification_tokens`, `organizations`, `agency_clients`, `organization_members`, `organization_invites`, `workspaces`, `api_keys`, `whatsapp_accounts`, `conversations`, `messages`, `leads`, `lead_stage_history`, `pipeline_stages`, `ai_runs`, `conversation_memories`, `knowledge_documents`, `knowledge_chunks`, `automations`, `automation_logs`, `subscriptions`, `usage_meters`, `audit_logs`, `notifications`, `webhook_events`, `tags`, `lead_tags`, `lead_notes`, `tasks`, `campaigns`, `campaign_recipients`, `tracking_links`

Plus **pgvector** extension for knowledge embeddings.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Can't reach database server` | Check password, IP allowlist (Supabase allows all by default), URL typos |
| `extension "vector" is not available` | Enable in Dashboard → Database → Extensions → **vector** |
| Prisma P1001 | Use `DIRECT_URL` for `db push`, pooler for runtime only |
| API still 500 on verify-email | Vercel still pointing at old DB — redeploy after env change |
| `pnpm: command not found` | `export PATH="$HOME/.local/node/bin:$PATH"` + `corepack enable` |
