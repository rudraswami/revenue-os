import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decryptSecret } from "../../common/crypto/token-cipher";
import { fetchWithTimeout } from "../../common/http/fetch-with-timeout";

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

    const res = await fetchWithTimeout(`https://graph.facebook.com/${version}/${account.phoneNumberId}/messages`, {
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

    const res = await fetchWithTimeout(
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

  async listMessageTemplates(
    wabaId: string,
    accessTokenEnc: string,
  ): Promise<
    Array<{
      name: string;
      language: string;
      status: string;
      category?: string;
      bodyPreview: string;
      bodyVariableCount: number;
    }>
  > {
    const token = decryptSecret(accessTokenEnc);
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";

    const res = await fetchWithTimeout(
      `https://graph.facebook.com/${version}/${wabaId}/message_templates?limit=100&fields=name,status,language,category,components`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const data = (await res.json()) as {
      data?: Array<{
        name: string;
        status: string;
        language: string;
        category?: string;
        components?: Array<{ type: string; text?: string }>;
      }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      this.logger.warn(`Meta template list failed: ${data.error?.message ?? res.status}`);
      throw new BadRequestException(
        data.error?.message ??
          "Could not load templates from WhatsApp. Refresh your token in Settings.",
      );
    }

    return (data.data ?? [])
      .filter((t) => t.status === "APPROVED")
      .map((t) => {
        const body = t.components?.find((c) => c.type === "BODY")?.text ?? "";
        const matches = body.match(/\{\{\d+\}\}/g);
        return {
          name: t.name,
          language: t.language,
          status: t.status,
          category: t.category,
          bodyPreview: body.slice(0, 200),
          bodyVariableCount: matches?.length ?? 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async fetchMedia(
    account: WhatsappAccountRow,
    mediaId: string,
  ): Promise<{ data: ArrayBuffer; contentType: string }> {
    const token = decryptSecret(account.accessTokenEnc);
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";

    const metaRes = await fetchWithTimeout(`https://graph.facebook.com/${version}/${mediaId}`, {
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

    const fileRes = await fetchWithTimeout(
      metaBody.url,
      { headers: { Authorization: `Bearer ${token}` } },
      30_000,
    );
    if (!fileRes.ok) {
      throw new BadRequestException("Could not download media from WhatsApp.");
    }

    return {
      data: await fileRes.arrayBuffer(),
      contentType: metaBody.mime_type ?? fileRes.headers.get("content-type") ?? "application/octet-stream",
    };
  }

  async uploadMedia(
    account: WhatsappAccountRow,
    file: Buffer,
    mimeType: string,
    filename?: string,
  ): Promise<string> {
    if (!account.isActive) {
      throw new BadRequestException("WhatsApp number is not active.");
    }

    const token = decryptSecret(account.accessTokenEnc);
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", mimeType);
    form.append("file", new Blob([new Uint8Array(file)], { type: mimeType }), filename ?? "file");

    const res = await fetchWithTimeout(
      `https://graph.facebook.com/${version}/${account.phoneNumberId}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
      60_000,
    );

    const data = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok || !data.id) {
      this.logger.warn(`Meta media upload failed: ${data.error?.message ?? res.status}`);
      throw new BadRequestException(
        data.error?.message ?? "Could not upload file to WhatsApp.",
      );
    }
    return data.id;
  }

  async sendImage(
    account: WhatsappAccountRow,
    toPhone: string,
    mediaId: string,
    caption?: string,
  ): Promise<string> {
    return this.sendMediaMessage(account, toPhone, "image", { id: mediaId }, caption);
  }

  async sendDocument(
    account: WhatsappAccountRow,
    toPhone: string,
    mediaId: string,
    filename: string,
    caption?: string,
  ): Promise<string> {
    return this.sendMediaMessage(account, toPhone, "document", { id: mediaId, filename }, caption);
  }

  private async sendMediaMessage(
    account: WhatsappAccountRow,
    toPhone: string,
    type: "image" | "document",
    media: { id: string; filename?: string },
    caption?: string,
  ): Promise<string> {
    if (!account.isActive) {
      throw new BadRequestException("WhatsApp number is not active.");
    }

    const token = decryptSecret(account.accessTokenEnc);
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";
    const to = toPhone.replace(/\D/g, "");
    const trimmedCaption = caption?.trim();

    const block: Record<string, string> = { id: media.id };
    if (type === "document" && media.filename) block.filename = media.filename;
    if (trimmedCaption) block.caption = trimmedCaption.slice(0, 1024);

    const res = await fetchWithTimeout(`https://graph.facebook.com/${version}/${account.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type,
        [type]: block,
      }),
    });

    const data = (await res.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      this.logger.warn(`Meta ${type} send failed: ${data.error?.message ?? res.status}`);
      throw new BadRequestException(
        data.error?.message ?? "Could not send attachment. Check your WhatsApp connection.",
      );
    }

    const waMessageId = data.messages?.[0]?.id;
    if (!waMessageId) {
      throw new BadRequestException("Attachment sent but no confirmation from WhatsApp.");
    }

    return waMessageId;
  }
}
