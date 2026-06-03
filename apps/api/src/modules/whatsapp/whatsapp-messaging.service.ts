import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decryptSecret } from "../../common/crypto/token-cipher";

interface WhatsappAccountRow {
  phoneNumberId: string;
  accessTokenEnc: string;
  isActive: boolean;
}

@Injectable()
export class WhatsappMessagingService {
  private readonly logger = new Logger(WhatsappMessagingService.name);

  constructor(private readonly config: ConfigService) {}

  async sendText(account: WhatsappAccountRow, toPhone: string, body: string): Promise<string> {
    if (!account.isActive) {
      throw new BadRequestException("WhatsApp number is not active.");
    }

    const token = decryptSecret(account.accessTokenEnc);
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";
    const to = toPhone.replace(/\D/g, "");

    const res = await fetch(`https://graph.facebook.com/${version}/${account.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });

    const data = (await res.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      this.logger.warn(`Meta send failed: ${data.error?.message ?? res.status}`);
      throw new BadRequestException(
        data.error?.message ?? "Could not send message. Check your WhatsApp connection.",
      );
    }

    const waMessageId = data.messages?.[0]?.id;
    if (!waMessageId) {
      throw new BadRequestException("Message sent but no confirmation from WhatsApp.");
    }

    return waMessageId;
  }
}
