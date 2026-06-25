import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerModule } from "@nestjs/throttler";
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
import { BillingModule } from "./modules/billing/billing.module";
import { KnowledgeModule } from "./modules/knowledge/knowledge.module";
import { ApiKeysModule } from "./modules/api-keys/api-keys.module";
import { TagsModule } from "./modules/tags/tags.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { CampaignsModule } from "./modules/campaigns/campaigns.module";
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
    KnowledgeModule,
    ApiKeysModule,
    TagsModule,
    TasksModule,
    CampaignsModule,
  ],
})
export class AppModule {}
