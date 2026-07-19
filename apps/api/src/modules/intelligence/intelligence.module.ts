import { Module } from "@nestjs/common";
import { AutomationsModule } from "../automations/automations.module";
import { AssignmentModule } from "../assignments/assignment.module";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { EventsModule } from "../events/events.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { WhatsappMessagingModule } from "../whatsapp/whatsapp-messaging.module";
import { ActionExecutorService } from "./action-executor.service";
import { ActionPlannerService } from "./action-planner.service";
import { ContextBuilderService } from "./context-builder.service";
import { ExecutionRouterService } from "./execution-router.service";
import { FastReplyService } from "./fast-reply.service";
import { IntelligenceQueryService } from "./intelligence-query.service";
import { LearningSignalService } from "./learning-signal.service";
import { ObservedMemoryService } from "./observed-memory.service";
import { PostCloseAlertService } from "./post-close-alert.service";
import { ReplyComposerService } from "./reply-composer.service";
import { AutomationPolicyService } from "./automation-policy.service";
import { ReplyPolicyService } from "./reply-policy.service";
import { ReplySafetyRailsService } from "./reply-safety-rails.service";
import { ReplyTrustRailsService } from "./reply-trust-rails.service";
import { ReplySendService } from "./reply-send.service";
import { SuggestReplyService } from "./suggest-reply.service";

@Module({
  imports: [
    EventsModule,
    RealtimeModule,
    AutomationsModule,
    AuthModule,
    BillingModule,
    AssignmentModule,
    WebhooksModule,
    KnowledgeModule,
    WhatsappMessagingModule,
  ],
  providers: [
    ContextBuilderService,
    ObservedMemoryService,
    AutomationPolicyService,
    ReplySafetyRailsService,
    ReplyTrustRailsService,
    ReplyPolicyService,
    ReplyComposerService,
    ReplySendService,
    FastReplyService,
    ExecutionRouterService,
    ActionPlannerService,
    ActionExecutorService,
    SuggestReplyService,
    IntelligenceQueryService,
    LearningSignalService,
    PostCloseAlertService,
  ],
  exports: [
    ContextBuilderService,
    ObservedMemoryService,
    AutomationPolicyService,
    ReplySafetyRailsService,
    ReplyTrustRailsService,
    ReplyPolicyService,
    ReplyComposerService,
    ReplySendService,
    FastReplyService,
    ExecutionRouterService,
    ActionPlannerService,
    ActionExecutorService,
    SuggestReplyService,
    IntelligenceQueryService,
    LearningSignalService,
    PostCloseAlertService,
  ],
})
export class IntelligenceModule {}
