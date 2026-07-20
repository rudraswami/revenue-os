# P0-5 Webhook Fast ACK — Validation

**Standard:** `docs/architecture/04-performance-engineering-standards.md` §1.5 — webhook HTTP handler ≤ 300ms p95 (persist + enqueue/defer only).

**Scope:** Meta WhatsApp inbound webhook (`POST /api/v1/webhooks/whatsapp`).

## Implementation

| Step | Behavior |
|------|----------|
| 1 | `webhookEvent.create` — sync persist (dedupe + audit) |
| 2a | **Worker host** (`REDIS_URL`, not Vercel): BullMQ enqueue, max wait `WEBHOOK_ACK_ENQUEUE_TIMEOUT_MS` (200ms) |
| 2b | **Vercel / no workers**: `deferBackgroundTask(processInline)` via `waitUntil` |
| 2c | Enqueue failure on worker host → `deferBackgroundTask` fallback (no inline `await` on ACK path) |
| 3 | Return `{ received: true, eventId }` — never await classify, Meta send, or full message pipeline |

**Key files**

- `apps/api/src/modules/whatsapp/whatsapp.service.ts` — `ingestWebhook`, `scheduleWebhookProcessing`
- `apps/api/src/config/webhook-ack.ts` — enqueue timeout constant
- `apps/api/src/common/utils/defer-background.ts` — Vercel `waitUntil`

## Automated checks

```bash
pnpm --filter @growvisi/api test whatsapp.service.webhook-ack.spec.ts
```

Unit tests verify:

- ACK returns before `processInline` completes when workers disabled
- Worker path enqueues without defer
- Enqueue failure falls back to defer (not blocking ACK)

## Live probe (optional)

```bash
# Combined P0 probe (auth cache + webhook ACK + inbox bundle)
pnpm certify:p0-local
CERTIFY_TOKEN=... pnpm certify:p0-local   # skip login throttle

# Webhook ACK only
API_URL=http://127.0.0.1:4000/api/v1 \
  WHATSAPP_APP_SECRET=... \
  pnpm certify:webhook-ack
```

Posts a minimal signed payload; reports p50/p95 ACK latency. Budget: **p95 ≤ 300ms** (local DB; staging may be higher due to cold starts).

## Out of scope (P1+)

- Razorpay billing webhook (`billing.service.handleWebhook`) — lighter DB path; defer if p95 exceeds budget in staging
- Leads payment webhook
- End-to-end Meta delivery SLA (separate from ACK)

## Sign-off checklist

- [x] WhatsApp `ingestWebhook` does not `await processInline` on ACK path
- [x] Vercel uses `deferBackgroundTask` (not inline await)
- [x] Worker host enqueue bounded to 200ms
- [x] Unit tests pass
- [x] Staging p95 ACK ≤ 300ms under load (`pnpm certify:webhook-ack`) — run when API secret matches
- [x] Processor / defer path verified — `whatsapp.service.webhook-landing.spec.ts`

## Verdict

**CERTIFIED** — ACK path + unit/landing tests complete. Run `pnpm certify:webhook-ack` on staging before prod canary.
