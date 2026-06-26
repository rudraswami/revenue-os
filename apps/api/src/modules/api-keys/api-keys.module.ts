import { Module } from "@nestjs/common";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { BillingModule } from "../billing/billing.module";
import { ApiKeysController } from "./api-keys.controller";
import { ApiKeysService } from "./api-keys.service";

@Module({
  imports: [BillingModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService, SubscriptionGuard],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
