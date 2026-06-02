# Revenue OS — System Architecture Overview

## Vision

Revenue OS is an **AI-native Revenue Operating System** for WhatsApp-first businesses. It autonomously manages conversations, lead intelligence, pipeline movement, analytics, and sales workflows—not a chatbot wrapper.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENTS (Browser / Mobile)                        │
│                    Next.js App · React Query · WebSocket                    │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTPS / WSS
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                         API GATEWAY LAYER (NestJS)                          │
│  Auth · RBAC · Rate Limit · Tenant Context · REST · GraphQL (future)        │
└───────┬─────────────────┬─────────────────┬─────────────────┬─────────────┘
        │                 │                 │                 │
        ▼                 ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Conversation │  │   Pipeline   │  │  Analytics   │  │  Automation  │
│   Module     │  │   Module     │  │   Module     │  │   Module     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
        │                 │                 │                 │
        └─────────────────┴────────┬────────┴─────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EVENT BUS (Domain Events)                           │
│              In-process EventEmitter2 → BullMQ for async work               │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌──────────────┐           ┌──────────────┐           ┌──────────────┐
│  PostgreSQL  │           │    Redis     │           │  AI Layer    │
│  + pgvector  │           │ Cache·Queues │           │ Orchestrator │
└──────────────┘           └──────────────┘           └──────────────┘
        ▲                           ▲                           ▲
        │                           │                           │
┌───────┴───────────────────────────┴───────────────────────────┴───────────┐
│                    WhatsApp Cloud API (Meta Webhooks)                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

```
revenue-os/
├── apps/
│   ├── api/                 # NestJS — domain modules, webhooks, workers
│   └── web/                 # Next.js — AI-native dashboard
├── packages/
│   ├── database/            # Prisma schema, migrations, client
│   └── shared/              # Types, events, constants, validators
├── docker/                  # Local infra
├── docs/architecture/       # ADRs and system design
└── .github/workflows/       # CI/CD
```

## Multi-Tenancy Model

- **Organization** = tenant boundary (billing, data isolation)
- **Workspace** = optional sub-division (teams, brands)
- All queries scoped by `organizationId` via Prisma middleware + request context
- Row-level security enforced at application layer; Postgres RLS optional Phase 2

## Core Domain Bounded Contexts

| Context | Responsibility |
|---------|----------------|
| Identity | Users, sessions, RBAC, audit |
| Tenant | Organizations, workspaces, memberships |
| Channel | WhatsApp accounts, webhook ingestion |
| Conversation | Threads, messages, media, handoff |
| Intelligence | Lead classification, AI memory, RAG |
| Pipeline | Stages, deals, Kanban |
| Analytics | Funnel, metrics, insights |
| Automation | Rules, triggers, workflows |
| Billing | Plans, usage meters (architecture-ready) |

## Technology Decisions

| Concern | Choice | Rationale |
|---------|--------|-----------|
| API | NestJS + CQRS (selective) | Modular domains, DI, enterprise patterns |
| DB | PostgreSQL + Prisma | Relational integrity + migrations |
| Vectors | pgvector | Co-locate embeddings with tenant data |
| Queue | BullMQ + Redis | Reliable async AI + webhook processing |
| Real-time | Socket.io / native WS | Inbox live updates |
| Frontend | Next.js App Router | SSR, layouts, enterprise UX |
| Observability | OTel + Sentry + PostHog | Traces, errors, product analytics |

## Security Model

- JWT access + refresh rotation
- Organization-scoped API keys for integrations
- WhatsApp webhook HMAC verification (X-Hub-Signature-256)
- Secrets via environment / K8s secrets (Vault-ready)
- Audit log on sensitive mutations
- PII encryption at rest (Phase 2: field-level)

## Scaling Strategy

| Layer | Strategy |
|-------|----------|
| API | Horizontal pods behind load balancer |
| Workers | Separate BullMQ consumer deployments |
| DB | Read replicas, connection pooling (PgBouncer) |
| Redis | Cluster mode for HA |
| Webhooks | Idempotent ingestion via `message.waMessageId` unique index |
| AI | Queue-backed inference, rate limits per org |

## Milestone Roadmap

1. **M1 — Foundation** (current): Monorepo, schema, auth, org, webhook ingestion
2. **M2 — Conversation Core**: Persistence, inbox UI, real-time
3. **M3 — AI Engine**: Classification, replies, memory, RAG
4. **M4 — Pipeline & Analytics**: Kanban, funnel, insights
5. **M5 — Automations & Agents**: Rules, multi-agent orchestration
6. **M6 — Later**: Billing, optional SSO (only if needed), observability
