import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { MessageTemplateCategory, MessageTemplateView } from "@growvisi/shared";
import { decryptSecret } from "../../common/crypto/token-cipher";
import { fetchWithTimeout } from "../../common/http/fetch-with-timeout";

interface WhatsappAccountRow {
  phoneNumberId: string;
  accessTokenEnc: string;
  isActive: boolean;
}

type MetaTemplateRow = {
  id?: string;
  name: string;
  status: string;
  language: string;
  category?: string;
  rejected_reason?: string;
  components?: Array<{ type: string; text?: string }>;
};

export type ListMessageTemplatesOptions = {
  /** When true (default), only APPROVED — preserves campaign picker behavior. */
  approvedOnly?: boolean;
};

export type CreateMessageTemplateInput = {
  name: string;
  language: string;
  category: MessageTemplateCategory;
  body: string;
};

export type UpdateMessageTemplateInput = {
  body: string;
  category?: MessageTemplateCategory;
};

export type DeleteMessageTemplateInput = {
  name: string;
  metaTemplateId?: string;
};

@Injectable()
export class WhatsappMessagingService {
  private readonly logger = new Logger(WhatsappMessagingService.name);

  constructor(private readonly config: ConfigService) {}

  async sendText(
    account: WhatsappAccountRow,
    toPhone: string,
    body: string,
    opts?: { replyToWaMessageId?: string },
  ): Promise<string> {
    if (!account.isActive) {
      throw new BadRequestException("WhatsApp number is not active.");
    }

    const token = decryptSecret(account.accessTokenEnc);
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";
    const to = toPhone.replace(/\D/g, "");

    const payload: Record<string, unknown> = {
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    };
    if (opts?.replyToWaMessageId) {
      payload.context = { message_id: opts.replyToWaMessageId };
    }

    const res = await fetchWithTimeout(`https://graph.facebook.com/${version}/${account.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
    options: ListMessageTemplatesOptions = {},
  ): Promise<MessageTemplateView[]> {
    const { approvedOnly = true } = options;
    const rows = await this.fetchMessageTemplatesFromMeta(wabaId, accessTokenEnc);
    const mapped = rows.map((t) => this.mapMetaTemplate(t));
    const filtered = approvedOnly
      ? mapped.filter((t) => t.status === "APPROVED")
      : mapped;
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  async createMessageTemplate(
    wabaId: string,
    accessTokenEnc: string,
    input: CreateMessageTemplateInput,
  ): Promise<MessageTemplateView> {
    const token = decryptSecret(accessTokenEnc);
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";

    const res = await fetchWithTimeout(
      `https://graph.facebook.com/${version}/${wabaId}/message_templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: input.name,
          language: input.language,
          category: input.category,
          components: [{ type: "BODY", text: input.body }],
        }),
      },
    );

    const data = (await res.json()) as {
      id?: string;
      status?: string;
      category?: string;
      error?: { message?: string; error_user_msg?: string };
    };

    if (!res.ok) {
      const detail = data.error?.error_user_msg ?? data.error?.message ?? res.status;
      this.logger.warn(`Meta template create failed: ${detail}`);
      throw new BadRequestException(
        data.error?.message ??
          "Could not submit template to WhatsApp. Check your WABA permissions and try again.",
      );
    }

    return {
      name: input.name,
      language: input.language,
      status: data.status ?? "PENDING",
      category: input.category,
      bodyPreview: input.body.slice(0, 200),
      bodyText: input.body,
      bodyVariableCount: (input.body.match(/\{\{\d+\}\}/g) ?? []).length,
      metaTemplateId: data.id,
    };
  }

  async updateMessageTemplate(
    metaTemplateId: string,
    accessTokenEnc: string,
    input: UpdateMessageTemplateInput,
  ): Promise<MessageTemplateView> {
    const token = decryptSecret(accessTokenEnc);
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";

    const payload: Record<string, unknown> = {
      components: [{ type: "BODY", text: input.body }],
    };
    if (input.category) payload.category = input.category;

    const res = await fetchWithTimeout(
      `https://graph.facebook.com/${version}/${metaTemplateId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = (await res.json()) as {
      id?: string;
      status?: string;
      category?: string;
      name?: string;
      language?: string;
      error?: { message?: string; error_user_msg?: string };
    };

    if (!res.ok) {
      const detail = data.error?.error_user_msg ?? data.error?.message ?? res.status;
      this.logger.warn(`Meta template update failed: ${detail}`);
      throw new BadRequestException(
        data.error?.message ??
          "Could not update template on WhatsApp. Only approved, rejected, or paused templates can be edited.",
      );
    }

    return {
      name: data.name ?? "",
      language: data.language ?? "",
      status: data.status ?? "PENDING",
      category: data.category ?? input.category,
      bodyPreview: input.body.slice(0, 200),
      bodyText: input.body,
      bodyVariableCount: (input.body.match(/\{\{\d+\}\}/g) ?? []).length,
      metaTemplateId: data.id ?? metaTemplateId,
    };
  }

  async deleteMessageTemplate(
    wabaId: string,
    accessTokenEnc: string,
    input: DeleteMessageTemplateInput,
  ): Promise<void> {
    const token = decryptSecret(accessTokenEnc);
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";
    const params = new URLSearchParams({ name: input.name });
    if (input.metaTemplateId) params.set("hsm_id", input.metaTemplateId);

    const res = await fetchWithTimeout(
      `https://graph.facebook.com/${version}/${wabaId}/message_templates?${params.toString()}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const data = (await res.json()) as {
      success?: boolean;
      error?: { message?: string; error_user_msg?: string };
    };

    if (!res.ok) {
      const detail = data.error?.error_user_msg ?? data.error?.message ?? res.status;
      this.logger.warn(`Meta template delete failed: ${detail}`);
      throw new BadRequestException(
        data.error?.message ?? "Could not delete template from WhatsApp.",
      );
    }
  }

  private mapMetaTemplate(t: MetaTemplateRow): MessageTemplateView {
    const body = t.components?.find((c) => c.type === "BODY")?.text ?? "";
    const matches = body.match(/\{\{\d+\}\}/g);
    return {
      name: t.name,
      language: t.language,
      status: t.status,
      category: t.category,
      bodyPreview: body.slice(0, 200),
      bodyText: body,
      bodyVariableCount: matches?.length ?? 0,
      metaTemplateId: t.id,
      rejectedReason: t.rejected_reason,
    };
  }

  private async fetchMessageTemplatesFromMeta(
    wabaId: string,
    accessTokenEnc: string,
  ): Promise<MetaTemplateRow[]> {
    const token = decryptSecret(accessTokenEnc);
    const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";

    const res = await fetchWithTimeout(
      `https://graph.facebook.com/${version}/${wabaId}/message_templates?limit=100&fields=name,status,language,category,components,id,rejected_reason`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    const data = (await res.json()) as {
      data?: MetaTemplateRow[];
      error?: { message?: string };
    };

    if (!res.ok) {
      this.logger.warn(`Meta template list failed: ${data.error?.message ?? res.status}`);
      throw new BadRequestException(
        data.error?.message ??
          "Could not load templates from WhatsApp. Refresh your token in Settings.",
      );
    }

    return data.data ?? [];
  }

  /**
   * Send a WhatsApp read receipt (blue ticks) for the customer's latest
   * inbound message. Best-effort: this never throws so it cannot break the
   * inbox "mark read" flow. Meta only shows blue ticks if the customer has
   * read receipts enabled on their device.
   */
  async markRead(account: WhatsappAccountRow, waMessageId: string): Promise<void> {
    if (!account.isActive || !waMessageId) return;

    try {
      const token = decryptSecret(account.accessTokenEnc);
      const version = this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";
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
            status: "read",
            message_id: waMessageId,
          }),
        },
        10_000,
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        this.logger.debug(
          `Meta mark_as_read failed: ${data.error?.message ?? res.status}`,
        );
      }
    } catch (e) {
      this.logger.debug(`Meta mark_as_read error: ${(e as Error).message}`);
    }
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
