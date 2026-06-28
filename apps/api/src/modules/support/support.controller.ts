import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { JwtPayload } from "@growvisi/shared";
import { SetupHelpChatDto } from "./dto/setup-help.dto";
import { SetupHelpService } from "./setup-help.service";

@Controller("support")
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class SupportController {
  constructor(private readonly setupHelp: SetupHelpService) {}

  @Get("capabilities")
  capabilities() {
    return this.setupHelp.getCapabilities();
  }

  /** Merchant setup assistant — not customer WhatsApp chat. */
  @Post("setup-help")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  setupHelpChat(@CurrentUser() user: JwtPayload, @Body() dto: SetupHelpChatDto) {
    return this.setupHelp.chat(user, dto);
  }
}
