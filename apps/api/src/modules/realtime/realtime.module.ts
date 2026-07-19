import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { RealtimeBroadcastService } from "./realtime-broadcast.service";
import { RealtimeGateway } from "./realtime.gateway";

@Module({
  imports: [AuthModule, BillingModule, ConfigModule],
  providers: [RealtimeGateway, RealtimeBroadcastService],
  exports: [RealtimeGateway, RealtimeBroadcastService],
})
export class RealtimeModule {}
