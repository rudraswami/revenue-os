import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GROWVISI_EMAIL_SUPPORT } from "@growvisi/shared";
import { EmailService } from "../auth/email.service";

export type MarketingInquiryKind = "ai_chat" | "whatsapp_click";

@Injectable()
export class MarketingInquiryService {
  private readonly logger = new Logger(MarketingInquiryService.name);

  constructor(
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private loggingEnabled(): boolean {
    const flag = this.config.get<string>("MARKETING_INQUIRY_EMAIL")?.trim().toLowerCase();
    return flag !== "false" && flag !== "0";
  }

  /** Fire-and-forget lead signal to support inbox — not a customer auto-reply. */
  record(input: {
    kind: MarketingInquiryKind;
    message: string;
    page?: string;
    locale?: string;
    assistantReply?: string;
    escalate?: boolean;
    inquiryKind?: "sales" | "enterprise";
  }) {
    if (!this.loggingEnabled()) return;

    const supportTo =
      this.config.get<string>("SUPPORT_EMAIL")?.trim() || GROWVISI_EMAIL_SUPPORT;

    const subject =
      input.kind === "whatsapp_click"
        ? input.inquiryKind === "enterprise"
          ? "[Growvisi site] Enterprise WhatsApp inquiry"
          : input.inquiryKind === "sales"
            ? "[Growvisi site] Sales WhatsApp inquiry"
            : "[Growvisi site] WhatsApp inquiry opened"
        : input.escalate
          ? "[Growvisi site AI] Escalation — talk to sales"
          : "[Growvisi site AI] Product question";

    const body = [
      `Kind: ${input.kind}`,
      input.page ? `Page: ${input.page}` : null,
      input.locale ? `Locale: ${input.locale}` : null,
      input.inquiryKind ? `Inquiry: ${input.inquiryKind}` : null,
      "",
      `Visitor message:`,
      input.message.slice(0, 2000),
      input.assistantReply
        ? ["", "Assistant reply:", input.assistantReply.slice(0, 1500)].join("\n")
        : null,
      "",
      `Time: ${new Date().toISOString()}`,
      "— Logged from growvisi.in marketing (human follow-up on WhatsApp or email).",
    ]
      .filter(Boolean)
      .join("\n");

    void this.email
      .sendRaw({
        to: [supportTo],
        subject,
        text: body,
      })
      .catch((err) => {
        this.logger.warn(`Marketing inquiry email failed: ${String(err)}`);
      });
  }
}
