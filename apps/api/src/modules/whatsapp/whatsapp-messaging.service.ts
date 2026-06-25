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

  /**
   * Send a pre-approved WhatsApp message template (required by Meta for
   * business-initiated / outbound messages outside the 24h customer service
   * window). The template must already be approved in the WhatsApp Manager.
   */
  async sendTemplate(
    account: WhatsappAccountRow,
    toPhone: string,
    templateName: string,
    languageCode = "en",
    bodyParams: string[] = [],
  ): Promise<string> {
    if (!account.isActive) {
      throw new BadRequestException("WhatsApp number is not active.");
    }

    const token = decryptSecret(account.accessTokenEnc);
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";
    const to = toPhone.replace(/\D/g, "");

    const components =
      bodyParams.length > 0
        ? [
            {
              type: "body",
              parameters: bodyParams.map((text) => ({ type: "text", text })),
            },
          ]
        : undefined;

    const res = await fetch(
      `https://graph.facebook.com/${version}/${account.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            ...(components ? { components } : {}),
          },
        }),
      },
    );

    const data = (await res.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      this.logger.warn(`Meta template send failed: ${data.error?.message ?? res.status}`);
      throw new BadRequestException(
        data.error?.message ?? "Could not send template message. Check the template name and approval status.",
      );
    }

    const waMessageId = data.messages?.[0]?.id;
    if (!waMessageId) {
      throw new BadRequestException("Template sent but no confirmation from WhatsApp.");
    }
    return waMessageId;
  }

  async fetchMedia(
    account: WhatsappAccountRow,
    mediaId: string,
  ): Promise<{ data: ArrayBuffer; contentType: string }> {
    const token = decryptSecret(account.accessTokenEnc);
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";

    const metaRes = await fetch(`https://graph.facebook.com/${version}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const metaBody = (await metaRes.json()) as {
      url?: string;
      mime_type?: string;
      error?: { message?: string };
    };
    if (!metaRes.ok || !metaBody.url) {
      throw new BadRequestException(metaBody.error?.message ?? "Could not resolve media from WhatsApp.");
    }

    const fileRes = await fetch(metaBody.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!fileRes.ok) {
      throw new BadRequestException("Could not download media from WhatsApp.");
    }

    return {
      data: await fileRes.arrayBuffer(),
      contentType: metaBody.mime_type ?? fileRes.headers.get("content-type") ?? "application/octet-stream",
    };
  }
}
