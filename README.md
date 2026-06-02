# Revenue OS

**AI Revenue Operating System** for WhatsApp-first businesses.

Enterprise-grade, multi-tenant SaaS platform for autonomous AI sales operations: conversation management, lead intelligence, pipeline automation, and real-time revenue analytics.

## Architecture

```
apps/api     → NestJS API (webhooks, auth, AI queues, WebSockets)
apps/web     → Next.js dashboard (AI-native command center)
packages/database → Prisma + PostgreSQL + pgvector
packages/shared   → Domain types, events, constants
```

See [docs/architecture](./docs/architecture/) for system design.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (PostgreSQL + Redis)

## Quick Start

```bash
# Clone and install
cd revenue-os
cp .env.example .env
pnpm install

# Start infrastructure
pnpm docker:up

# Database
pnpm db:generate
pnpm db:push

# Run platform
pnpm dev
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:4000/api/v1 |
| Health | http://localhost:4000/api/v1/health |

## WhatsApp Webhook Setup

1. Create Meta App → WhatsApp Business Platform
2. Register `WhatsappAccount` in DB (Settings → coming in M2)
3. Webhook URL: `https://<your-domain>/api/v1/webhooks/whatsapp`
4. Verify token: `WHATSAPP_VERIFY_TOKEN` from `.env`
5. Subscribe to `messages` field

## Milestone 1 (Delivered)

- [x] Monorepo (Turbo + pnpm)
- [x] Enterprise Prisma schema (multi-tenant)
- [x] Auth + RBAC foundation (JWT, org registration)
- [x] WhatsApp webhook ingestion (signature verify, BullMQ, idempotency)
- [x] Conversation + message persistence
- [x] Lead pipeline + funnel metrics API
- [x] WebSocket real-time gateway
- [x] AI-native dashboard shell

## Milestone 2 (Next)

- AI classification + response workers
- OpenAI / Claude orchestration layer
- Knowledge base + pgvector RAG
- Human takeover UX
- WhatsApp outbound messaging

## License

Proprietary — All rights reserved.
