import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { MarketingHelpChatDto } from "./dto/marketing-help.dto";
import { MarketingInquiryDto } from "./dto/marketing-inquiry.dto";
import { MarketingHelpService } from "./marketing-help.service";
import { MarketingInquiryService } from "./marketing-inquiry.service";

/** Unauthenticated marketing site FAQ assistant — not merchant/customer WhatsApp. */
@Controller("public/marketing-help")
@UseGuards(ThrottlerGuard)
export class MarketingHelpController {
  constructor(
    private readonly marketingHelp: MarketingHelpService,
    private readonly inquiries: MarketingInquiryService,
  ) {}

  @Get("capabilities")
  capabilities() {
    return this.marketingHelp.getCapabilities();
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  chat(@Body() dto: MarketingHelpChatDto) {
    return this.marketingHelp.chat(dto);
  }

  @Post("inquiry")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  recordInquiry(@Body() dto: MarketingInquiryDto) {
    this.inquiries.record({
      kind: dto.kind,
      message: dto.message?.trim() || "Opened WhatsApp from marketing site",
      page: dto.page,
      locale: dto.locale,
      inquiryKind: dto.inquiryKind,
    });
    return { ok: true };
  }
}
