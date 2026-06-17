import { Body, Controller, Post } from "@nestjs/common";
import { ContactService } from "./contact.service";
import { ContactDto } from "./dto/contact.dto";

@Controller("contact")
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Post()
  submit(@Body() dto: ContactDto) {
    return this.contact.submit(dto);
  }
}
