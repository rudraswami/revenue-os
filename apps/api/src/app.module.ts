import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { CapabilityGuard } from "./common/guards/capability.guard";
import { AuthModule } from "./modules/auth/auth.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { HealthModule } from "./modules/health/health.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";
import { WhatsappAccountsModule } from "./modules/whatsapp-accounts/whatsapp-accounts.module";
import { WhatsappModule } from "./modules/whatsapp/whatsapp.module";
import { AiModule } from "./modules/ai/ai.module";
import { ContactModule } from "./modules/contact/contact.module";
import { MetaModule } from "./modules/meta/meta.module";
import { InternalModule } from "./modules/internal/internal.module";
import { AutomationsModule } from "./modules/automations/automations.module";
import { AuditModule } from "./modules/audit/audit.module";
import { BillingModule } from "./modules/billing/billing.module";
import { KnowledgeModule } from "./modules/knowledge/knowledge.module";
import { ApiKeysModule } from "./modules/api-keys/api-keys.module";
import { ExternalModule } from "./modules/external/external.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { TrackingModule } from "./modules/tracking/tracking.module";
import { TagsModule } from "./modules/tags/tags.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { CampaignsModule } from "./modules/campaigns/campaigns.module";
import { AgencyModule } from "./modules/agency/agency.module";
import { SupportModule } from "./modules/support/support.module";
import { validateEnv } from "./config/env.validation";
import { QUEUES } from "@growvisi/shared";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
      validate: validateEnv,
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 120 }]),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? "redis://localhost:6379",
        // Cap reconnect backoff instead of ioredis's default unbounded retry —
        // paired with the `withTimeout` guards around `queue.add()`, this keeps
        // an unreachable Redis from silently hanging requests forever.
        retryStrategy: (times: number) => Math.min(times * 200, 5_000),
        connectTimeout: 5_000,
      },
    }),
    BullModule.registerQueue(
      { name: QUEUES.WHATSAPP_INBOUND },
      { name: QUEUES.AI_CLASSIFY },
    ),
    PrismaModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    WhatsappModule,
    AiModule,
    WhatsappAccountsModule,
    ConversationsModule,
    LeadsModule,
    RealtimeModule,
    ContactModule,
    MetaModule,
    InternalModule,
    AutomationsModule,
    BillingModule,
    AuditModule,
    KnowledgeModule,
    ApiKeysModule,
    ExternalModule,
    WebhooksModule,
    TrackingModule,
    TagsModule,
    TasksModule,
    CampaignsModule,
    AgencyModule,
    SupportModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CapabilityGuard,
    },
  ],
})
export class AppModule {}
