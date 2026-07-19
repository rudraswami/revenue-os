# Performance engineering checklist

Use this on every dashboard / inbox / pipeline PR.

## Data loading

- [ ] No GET endpoints with write side effects (classify, persist activation, etc.)
- [ ] Shell routes use `GET /organizations/shell-bootstrap` or shared `QUERY_KEYS` — no duplicate `/auth/me` + `/billing` + `/onboarding-progress` storms
- [ ] Live counters (inbox unread, queue tabs) use `GET /conversations/stats?scope=queue` with `useVisibleRefetchInterval` — not full stats
- [ ] Thread open uses slim endpoints (`/inbox-context`, `/knowledge-gaps`) — not full `/intelligence`
- [ ] Messages paginated (latest 50 + `before` cursor); pipeline capped per stage with `perStageLimit`

## UI responsiveness

- [ ] Mutations use optimistic cache patches (`inbox-query-cache`) with rollback on error
- [ ] Auth bootstrap is non-blocking — shell renders from Zustand persist while cookie refresh runs
- [ ] Loading states use shared components (`GrowvisiLogoLoader`, `PanelRowsSkeleton`, page `loading.tsx`)
- [ ] No spinner flash on known-good persisted state (WhatsApp banner, onboarding)

## Realtime & cache

- [ ] Production: Supabase Broadcast when `SUPABASE_*` + `NEXT_PUBLIC_SUPABASE_*` are set; Socket.IO for local/dedicated API host
- [ ] Realtime handlers use `handleRealtimeEvent` — targeted invalidation, not blanket `invalidateQueries` on unrelated keys
- [ ] Tab-hidden polling backoff via `useVisibleRefetchInterval`

## Observability

- [ ] `NEXT_PUBLIC_SENTRY_DSN` set in production for client errors
- [ ] `SENTRY_DSN` set on API
- [ ] Performance budgets in `lib/performance.ts` for inbox send, thread open, shell bootstrap

## API / DB

- [ ] SLA metrics batch first-inbound lookup (no per-conversation N+1)
- [ ] GIN index on `Conversation.metadata` for handoff filters (migration `20260719160000_performance_indexes.sql`)
- [ ] Server-side entitlements enforced — UI gates mirror API only

## Deploy

- [ ] `pnpm test` + `pnpm build` pass locally
- [ ] Run `pnpm supabase:push` for new migrations before API deploy
- [ ] Vercel: API `apps/api`, Web `apps/web` — see `docs/DEPLOY-PREFLIGHT.md`
