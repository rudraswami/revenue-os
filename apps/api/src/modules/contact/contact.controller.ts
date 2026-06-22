import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { ContactService } from "./contact.service";
import { ContactDto } from "./dto/contact.dto";

@Controller("contact")
@UseGuards(ThrottlerGuard)
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(@Body() dto: ContactDto) {
    return this.contact.submit(dto);
  }
}
