import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { DigestService } from "./digest.service";

@Module({
  imports: [AuthModule, BillingModule],
  providers: [DigestService],
  exports: [DigestService],
})
export class DigestModule {}
