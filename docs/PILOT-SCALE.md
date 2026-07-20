# Pilot scale limits (Vercel deployment)

Growvisi on **Vercel serverless** runs WhatsApp classify and embed jobs **inline** inside the webhook HTTP request (`useBackgroundWorkers()` returns `false` when `VERCEL=1`).

## What works well for pilot

- 1–20 person teams with moderate inbound volume
- Single active WhatsApp number per workspace
- Daily digest, follow-up crons (Vercel Cron + `CRON_SECRET`)

## Known limits

| Limit | Impact | Mitigation |
|-------|--------|------------|
| Inline classify on webhook | Meta webhook timeout risk under spike | Deploy always-on worker with `USE_INLINE_WORKERS=0` + `REDIS_URL` |
| No WebSocket on Vercel | Inbox polls every ~30s | Accept for pilot; or add SSE/Ably later |
| Lead cap | New numbers skip CRM lead but **still classify** (intelligence on conversation) | Upgrade plan for pipeline CRM |
| `LATENCY_PROBE_ENABLED` | Off by default | Set `true` + pass `conversationId` for diagnostics (dry-run, no auto-send) |

## Production secrets (fail-fast)

On `VERCEL_ENV=production`, API startup **requires**: `WHATSAPP_APP_SECRET` or `META_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `REDIS_URL` (Upstash `rediss://`), `CRON_SECRET` (min 16 chars), `COOKIE_DOMAIN` (e.g. `.growvisi.in`), and `JWT_SECRET` (min 32 chars).

Recommended: `TOKEN_ENCRYPTION_KEY`, `OPENAI_API_KEY`, `RAZORPAY_*`.

Razorpay keys are recommended (warn-only) until billing is configured.

## Always-on workers (post-pilot)

See PRD **B-P1-6**. Run a long-lived Node process (Railway/Fly/ECS) with the same API image:

```bash
# Build once
pnpm --filter @growvisi/api build

# Worker host (no HTTP) — shares REDIS_URL + Postgres with Vercel API
WORKER_ONLY=1 USE_INLINE_WORKERS=0 REDIS_URL=rediss://... \
  pnpm --filter @growvisi/api start:worker
```

- Vercel API: `VERCEL=1` → enqueue only (`queueMode: vercel-queue+waitUntil`)
- Worker host: `WORKER_ONLY=1` → BullMQ consumers (`GET /health/queues` returns job counts)
- Certify: `pnpm certify:worker-queue`
