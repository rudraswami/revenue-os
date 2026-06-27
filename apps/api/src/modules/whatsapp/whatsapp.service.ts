import { createHmac, timingSafeEqual } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { createHash } from "crypto";
import { QUEUES } from "@growvisi/shared";
import { isProductionDeploy } from "../../config/production";
import { useBackgroundWorkers } from "../../config/workers";
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
  messageId: string;
  leadId: string | null;
}

import { AiClassifyService } from "../ai/ai-classify.service";
import { AssignmentService } from "../assignments/assignment.service";
import { TrackingService } from "../tracking/tracking.service";
import { WebhookDispatchService } from "../webhooks/webhook-dispatch.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUES.WHATSAPP_INBOUND) private readonly inboundQueue: Queue,
    private readonly aiClassify: AiClassifyService,
    private readonly realtime: RealtimeGateway,
    private readonly entitlements: EntitlementsService,
    private readonly assignments: AssignmentService,
    private readonly tracking: TrackingService,
    private readonly webhooks: WebhookDispatchService,
  ) {}

  verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
    const secret =
      this.config.get<string>("WHATSAPP_APP_SECRET")?.trim() ||
      this.config.get<string>("META_APP_SECRET")?.trim();
    if (!secret) {
      if (isProductionDeploy()) {
        this.logger.error("WHATSAPP_APP_SECRET missing in production — rejecting webhook");
        return false;
      }
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

    // Serverless without Redis — process inline; otherwise queue handles async work.
    if (!useBackgroundWorkers()) {
      try {
        const events = await this.processInboundPayload(payload);
        await this.prisma.webhookEvent.update({
          where: { id: event.id },
          data: {
            processedAt: new Date(),
            organizationId: events[0]?.organizationId ?? undefined,
          },
        });
        const orgIds = new Set<string>();
        for (const inbound of events) {
          orgIds.add(inbound.organizationId);
          this.realtime.emitMessageNew(inbound.organizationId, {
            conversationId: inbound.conversationId,
          });
          if (inbound.leadId) {
            await this.aiClassify.enqueue(inbound as typeof inbound & { leadId: string });
          }
        }
        for (const orgId of orgIds) {
          this.realtime.emitInboxUpdated(orgId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Inline webhook processing failed: ${message}`);
        await this.prisma.webhookEvent.update({
          where: { id: event.id },
          data: { error: message },
        });
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

        let account = await this.prisma.whatsappAccount.findFirst({
          where: { phoneNumberId, isActive: true },
        });
        if (!account && entry.id) {
          account = await this.prisma.whatsappAccount.findFirst({
            where: { wabaId: entry.id, isActive: true },
          });
          if (account && account.phoneNumberId !== phoneNumberId) {
            this.logger.warn(
              `Matched WABA ${entry.id} but webhook phone_number_id=${phoneNumberId} differs from stored ${account.phoneNumberId} — skipping (reconnect required)`,
            );
            account = null;
          }
        }
        if (!account) {
          this.logger.warn(`No WhatsApp account for phone_number_id=${phoneNumberId} waba=${entry.id}`);
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

    const existing = await this.prisma.message.findUnique({
      where: { organizationId_waMessageId: { organizationId, waMessageId } },
    });
    if (existing) return null;

    const isReaction = String(msg.type ?? "text") === "reaction";

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
        unreadCount: isReaction ? 0 : 1,
      },
      update: {
        contactName: contactName ?? undefined,
        lastMessageAt: new Date(),
        lastInboundAt: new Date(),
        ...(isReaction ? {} : { unreadCount: { increment: 1 } }),
      },
    });

    const type = this.mapMessageType(String(msg.type ?? "text"));
    const content = this.extractContent(msg);

    let message;
    try {
      message = await this.prisma.message.create({
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
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return null;
      }
      throw err;
    }

    let lead = await this.prisma.lead.findUnique({
      where: { organizationId_phone: { organizationId, phone: from } },
    });

    let isNewLead = false;

    if (lead) {
      if (contactName && contactName !== lead.displayName) {
        lead = await this.prisma.lead.update({
          where: { id: lead.id },
          data: { displayName: contactName },
        });
      }
    } else if (await this.entitlements.canCreateLead(organizationId)) {
      lead = await this.prisma.lead.create({
        data: {
          organizationId,
          phone: from,
          displayName: contactName,
          stage: "NEW",
        },
      });
      isNewLead = true;
    } else {
      // Monthly lead cap reached for this plan: still ingest the message and
      // conversation, but do not create a new lead until they upgrade.
      this.logger.warn(`Monthly lead cap reached for org=${organizationId} — message stored without new lead`);
    }

    if (lead && conversation.leadId !== lead.id) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { leadId: lead.id },
      });
    }

    if (lead && typeof content === "string") {
      void this.tracking
        .attributeLeadFromMessage(organizationId, lead.id, content, lead.profile)
        .catch(() => undefined);
    }

    if (isNewLead && lead) {
      void this.webhooks.emit(organizationId, "lead.created", {
        leadId: lead.id,
        phone: lead.phone,
        displayName: lead.displayName,
        stage: lead.stage,
        at: new Date().toISOString(),
      });
    }

    try {
      await this.assignments.applyAutoAssign(organizationId, {
        conversationId: conversation.id,
        leadId: lead?.id ?? null,
        reason: "new_inbound",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Auto-assign failed for conversation ${conversation.id}: ${message}`);
    }

    return {
      organizationId,
      conversationId: conversation.id,
      messageId: message.id,
      leadId: lead?.id ?? null,
    };
  }

  private static STATUS_RANK: Record<string, number> = {
    PENDING: 0,
    SENT: 1,
    DELIVERED: 2,
    READ: 3,
    FAILED: -1,
  };

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

    const existing = await this.prisma.message.findFirst({
      where: { organizationId, waMessageId },
      select: { status: true },
    });

    if (!existing) return;

    const currentRank = WhatsappService.STATUS_RANK[existing.status] ?? 0;
    const newRank = WhatsappService.STATUS_RANK[mapped] ?? 0;

    if (mapped === "FAILED" || newRank > currentRank) {
      await this.prisma.message.updateMany({
        where: { organizationId, waMessageId },
        data: { status: mapped as never },
      });
      await this.updateCampaignRecipientStatus(organizationId, waMessageId, mapped);
    }
  }

  private static CAMPAIGN_STATUS_RANK: Record<string, number> = {
    SENT: 1,
    DELIVERED: 2,
    READ: 3,
    FAILED: -1,
  };

  /** Meta delivery webhooks → campaign recipient + aggregate counts. */
  private async updateCampaignRecipientStatus(
    organizationId: string,
    waMessageId: string,
    mapped: string,
  ) {
    const recipient = await this.prisma.campaignRecipient.findFirst({
      where: {
        waMessageId,
        campaign: { organizationId },
      },
      select: { id: true, status: true, campaignId: true },
    });
    if (!recipient) return;

    const campaignStatus =
      mapped === "DELIVERED"
        ? "DELIVERED"
        : mapped === "READ"
          ? "READ"
          : mapped === "FAILED"
            ? "FAILED"
            : mapped === "SENT"
              ? "SENT"
              : null;
    if (!campaignStatus) return;

    const prevRank = WhatsappService.CAMPAIGN_STATUS_RANK[recipient.status] ?? 0;
    const newRank = WhatsappService.CAMPAIGN_STATUS_RANK[campaignStatus] ?? 0;
    if (campaignStatus !== "FAILED" && newRank <= prevRank) return;

    await this.prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: campaignStatus as never },
    });

    if (campaignStatus === "DELIVERED") {
      await this.prisma.campaign.update({
        where: { id: recipient.campaignId },
        data: { deliveredCount: { increment: 1 } },
      });
    } else if (campaignStatus === "FAILED" && recipient.status !== "FAILED") {
      await this.prisma.campaign.update({
        where: { id: recipient.campaignId },
        data: { failedCount: { increment: 1 } },
      });
    }
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

  private extractContent(msg: Record<string, unknown>): string | null {
    const text = this.extractText(msg);
    if (text) return text;

    const type = String(msg.type ?? "text");
    const block = msg[type] as Record<string, unknown> | undefined;
    const caption =
      block?.caption != null
        ? String(block.caption)
        : type === "document" && block?.filename
          ? String(block.filename)
          : null;

    const labels: Record<string, string> = {
      image: "Image",
      audio: "Voice message",
      video: "Video",
      document: "Document",
      sticker: "Sticker",
      location: "Location shared",
      contacts: "Contact shared",
    };
    const label = labels[type] ?? "Attachment";
    return caption ? `${label}: ${caption}` : `[${label}]`;
  }
}
