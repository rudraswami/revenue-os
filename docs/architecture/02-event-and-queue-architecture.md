# Event & Queue Architecture

## Domain Events (packages/shared)

Synchronous domain events use `@nestjs/event-emitter` for in-process reactions.
Async side effects use BullMQ queues.

### Event Catalog (initial)

| Event | Trigger | Async Consumers |
|-------|---------|-----------------|
| `message.received` | WhatsApp webhook | AI classify, analytics, notifications |
| `message.sent` | Outbound API success | Analytics |
| `message.status.updated` | Delivery/read webhook | Analytics, SLA tracking |
| `lead.stage.changed` | Classification / manual | Pipeline, automations, insights |
| `conversation.assigned` | Human takeover | Notifications |
| `conversation.ai.handoff` | AI escalation rules | Notifications, inbox |
| `automation.triggered` | Rule match | Action executor |

## Queue Topology

```
┌─────────────────────────────────────────────────────────┐
│                    BullMQ Queues                        │
├─────────────────────────────────────────────────────────┤
│ whatsapp.inbound      │ Process raw webhook payloads    │
│ ai.classify           │ Lead stage classification       │
│ ai.respond            │ Generate & send AI replies      │
│ ai.embed              │ Knowledge base embedding jobs   │
│ notifications.dispatch│ Email/push/in-app               │
│ analytics.aggregate   │ Rollup metrics (cron)           │
└─────────────────────────────────────────────────────────┘
```

## Idempotency

- Webhook jobs keyed by `waMessageId` + `organizationId`
- BullMQ `jobId` = deterministic hash to prevent duplicate processing
- DB unique constraints as final guard

## Retry Policy

| Queue | Attempts | Backoff |
|-------|----------|---------|
| whatsapp.inbound | 5 | exponential 2s |
| ai.classify | 3 | exponential 5s |
| ai.respond | 3 | exponential 5s |
| notifications | 5 | fixed 10s |

## Dead Letter

Failed jobs after max attempts → `failed_jobs` table + Sentry alert.
