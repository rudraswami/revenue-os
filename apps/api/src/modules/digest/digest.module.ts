import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BillingModule } from "../billing/billing.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WhatsappModule } from "../whatsapp/whatsapp.module";
import { DigestService } from "./digest.service";

@Module({
  imports: [AuthModule, BillingModule, PrismaModule, WhatsappModule],
  providers: [DigestService],
  exports: [DigestService],
})
export class DigestModule {}
