import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsIn, IsString } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequireEmailVerified } from "../../common/decorators/require-email-verified.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { JwtPayload } from "@growvisi/shared";
import { PAID_PLAN_IDS } from "@growvisi/shared";
import { BillingService } from "./billing.service";

class CheckoutDto {
  @IsString()
  @IsIn([...PAID_PLAN_IDS])
  planId!: (typeof PAID_PLAN_IDS)[number];
}

@Controller("billing")
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  status(@CurrentUser() user: JwtPayload) {
    return this.billing.getStatus(user);
  }

  @Post("checkout")
  @RequireEmailVerified()
  checkout(@CurrentUser() user: JwtPayload, @Body() dto: CheckoutDto) {
    return this.billing.createCheckout(user, dto.planId);
  }

  @Post("cancel")
  @RequireEmailVerified()
  cancel(@CurrentUser() user: JwtPayload) {
    return this.billing.cancelSubscription(user);
  }
}
