import { Module } from "@nestjs/common";
import { AutomationsModule } from "../automations/automations.module";
import { AssignmentModule } from "../assignments/assignment.module";
import { BillingModule } from "../billing/billing.module";
import { EventsModule } from "../events/events.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { WhatsappMessagingModule } from "../whatsapp/whatsapp-messaging.module";
import { ActionExecutorService } from "./action-executor.service";
import { ActionPlannerService } from "./action-planner.service";
import { ContextBuilderService } from "./context-builder.service";
import { IntelligenceQueryService } from "./intelligence-query.service";
import { LearningSignalService } from "./learning-signal.service";
import { ObservedMemoryService } from "./observed-memory.service";
import { ReplyComposerService } from "./reply-composer.service";
import { ReplyPolicyService } from "./reply-policy.service";
import { ReplySendService } from "./reply-send.service";
import { SuggestReplyService } from "./suggest-reply.service";

@Module({
  imports: [
    EventsModule,
    RealtimeModule,
    AutomationsModule,
    BillingModule,
    AssignmentModule,
    WebhooksModule,
    KnowledgeModule,
    WhatsappMessagingModule,
  ],
  providers: [
    ContextBuilderService,
    ObservedMemoryService,
    ReplyPolicyService,
    ReplyComposerService,
    ReplySendService,
    ActionPlannerService,
    ActionExecutorService,
    SuggestReplyService,
    IntelligenceQueryService,
    LearningSignalService,
  ],
  exports: [
    ContextBuilderService,
    ObservedMemoryService,
    ReplyPolicyService,
    ReplyComposerService,
    ReplySendService,
    ActionPlannerService,
    ActionExecutorService,
    SuggestReplyService,
    IntelligenceQueryService,
    LearningSignalService,
  ],
})
export class IntelligenceModule {}
