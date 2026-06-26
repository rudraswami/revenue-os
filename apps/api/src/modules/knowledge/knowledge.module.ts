import { Module } from "@nestjs/common";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { BillingModule } from "../billing/billing.module";
import { KnowledgeController } from "./knowledge.controller";
import { KnowledgeEmbedService } from "./knowledge-embed.service";
import { KnowledgeService } from "./knowledge.service";

@Module({
  imports: [BillingModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, KnowledgeEmbedService, MembershipRoleGuard, SubscriptionGuard],
  exports: [KnowledgeService, KnowledgeEmbedService],
})
export class KnowledgeModule {}
