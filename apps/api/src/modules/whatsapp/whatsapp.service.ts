import { createHmac, timingSafeEqual } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { createHash } from "crypto";
import { QUEUES } from "@growthsync/shared";
import { PrismaService } from "../prisma/prisma.service";

export interface WhatsappWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product?: string;
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
        messages?: Array<Record<string, unknown>>;
        statuses?: Array<Record<string, unknown>>;
      };
      field: string;
    }>;
  }>;
}

export interface InboundMessageEvent {
  organizationId: string;
  conversationId: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUES.WHATSAPP_INBOUND) private readonly inboundQueue: Queue,
  ) {}

  verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = this.config.get<string>("WHATSAPP_APP_SECRET");
    if (!secret) {
      this.logger.warn("WHATSAPP_APP_SECRET not set — skipping signature verification in dev");
      return true;
    }
    if (!signature?.startsWith("sha256=")) return false;

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const received = signature.slice(7);

    try {
      return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
    } catch {
      return false;
    }
  }

  async ingestWebhook(payload: WhatsappWebhookPayload) {
    const event = await this.prisma.webhookEvent.create({
      data: {
        source: "whatsapp",
        eventType: payload.object,
        payload: payload as object,
      },
    });

    // Vercel serverless has no background workers — process inline.
    if (process.env.VERCEL === "1") {
      try {
        await this.processInboundPayload(payload);
        await this.prisma.webhookEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date() },
        });
      } catch (err) {
        this.logger.error(`Inline webhook processing failed: ${String(err)}`);
      }
      return { received: true, eventId: event.id };
    }

    const jobId = createHash("sha256")
      .update(JSON.stringify({ id: event.id, entry: payload.entry }))
      .digest("hex");

    await this.inboundQueue.add(
      "process",
      { webhookEventId: event.id, payload },
      { jobId, removeOnComplete: 1000, removeOnFail: 5000 },
    );

    return { received: true, eventId: event.id };
  }

  async processInboundPayload(payload: WhatsappWebhookPayload): Promise<InboundMessageEvent[]> {
    const events: InboundMessageEvent[] = [];

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;

        const phoneNumberId = change.value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        const account = await this.prisma.whatsappAccount.findFirst({
          where: { phoneNumberId, isActive: true },
        });
        if (!account) {
          this.logger.warn(`No WhatsApp account for phone_number_id=${phoneNumberId}`);
          continue;
        }

        if (change.value.messages?.length) {
          for (const msg of change.value.messages) {
            const event = await this.persistInboundMessage(
              account.organizationId,
              account.id,
              change.value,
              msg,
            );
            if (event) events.push(event);
          }
        }

        if (change.value.statuses?.length) {
          for (const status of change.value.statuses) {
            await this.updateMessageStatus(account.organizationId, status);
          }
        }
      }
    }

    return events;
  }

  private async persistInboundMessage(
    organizationId: string,
    whatsappAccountId: string,
    value: WhatsappWebhookPayload["entry"][0]["changes"][0]["value"],
    msg: Record<string, unknown>,
  ) {
    const waMessageId = String(msg.id);
    const from = String(msg.from);
    const contactName = value.contacts?.find((c) => c.wa_id === from)?.profile?.name;

    const waConversationKey = `${whatsappAccountId}:${from}`;

    const conversation = await this.prisma.conversation.upsert({
      where: {
        organizationId_waConversationKey: { organizationId, waConversationKey },
      },
      create: {
        organizationId,
        whatsappAccountId,
        waConversationKey,
        contactPhone: from,
        contactName,
        lastMessageAt: new Date(),
        lastInboundAt: new Date(),
        unreadCount: 1,
      },
      update: {
        contactName: contactName ?? undefined,
        lastMessageAt: new Date(),
        lastInboundAt: new Date(),
        unreadCount: { increment: 1 },
      },
    });

    const existing = await this.prisma.message.findUnique({
      where: { organizationId_waMessageId: { organizationId, waMessageId } },
    });
    if (existing) return null;

    const type = this.mapMessageType(String(msg.type ?? "text"));
    const content = this.extractText(msg);

    const message = await this.prisma.message.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        waMessageId,
        direction: "INBOUND",
        type,
        status: "DELIVERED",
        content,
        payload: msg as object,
      },
    });

    const lead = await this.prisma.lead.upsert({
      where: { organizationId_phone: { organizationId, phone: from } },
      create: {
        organizationId,
        phone: from,
        displayName: contactName,
        stage: "NEW",
      },
      update: {
        displayName: contactName ?? undefined,
      },
    });

    if (conversation.leadId !== lead.id) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { leadId: lead.id },
      });
    }

    return {
      organizationId,
      conversationId: conversation.id,
    };
  }

  private async updateMessageStatus(organizationId: string, status: Record<string, unknown>) {
    const waMessageId = String(status.id);
    const statusValue = String(status.status).toUpperCase();

    const mapped =
      statusValue === "SENT"
        ? "SENT"
        : statusValue === "DELIVERED"
          ? "DELIVERED"
          : statusValue === "READ"
            ? "READ"
            : statusValue === "FAILED"
              ? "FAILED"
              : null;

    if (!mapped) return;

    await this.prisma.message.updateMany({
      where: { organizationId, waMessageId },
      data: { status: mapped as never },
    });
  }

  private mapMessageType(type: string) {
    const map: Record<string, string> = {
      text: "TEXT",
      image: "IMAGE",
      audio: "AUDIO",
      video: "VIDEO",
      document: "DOCUMENT",
      location: "LOCATION",
      contacts: "CONTACT",
      sticker: "STICKER",
      reaction: "REACTION",
      interactive: "INTERACTIVE",
    };
    return (map[type] ?? "TEXT") as never;
  }

  private extractText(msg: Record<string, unknown>): string | null {
    if (msg.type === "text" && msg.text && typeof msg.text === "object") {
      return String((msg.text as { body?: string }).body ?? "");
    }
    return null;
  }
}
