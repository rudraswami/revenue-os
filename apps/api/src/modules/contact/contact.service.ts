import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GROWVISI_EMAIL_FROM, GROWVISI_EMAIL_SUPPORT } from "@growvisi/shared";
import { EmailService } from "../auth/email.service";
import type { ContactDto } from "./dto/contact.dto";

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async submit(dto: ContactDto) {
    const supportTo =
      this.config.get<string>("SUPPORT_EMAIL")?.trim() || GROWVISI_EMAIL_SUPPORT;

    const body = [
      `Name: ${dto.name}`,
      `Email: ${dto.email}`,
      `Company: ${dto.company}`,
      dto.team ? `Team size: ${dto.team}` : null,
      "",
      dto.message?.trim() || "(no message)",
    ]
      .filter(Boolean)
      .join("\n");

    await this.email.sendRaw({
      to: [supportTo],
      replyTo: dto.email,
      subject: `[Growvisi demo] ${dto.company} — ${dto.name}`,
      text: body,
    });

    this.logger.log(`Contact form from ${dto.email}`);
    return { ok: true, message: "Thanks — we will reply within one business day." };
  }
}
