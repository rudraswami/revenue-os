import { createHmac, timingSafeEqual } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { createHash } from "crypto";
import { DOMAIN_EVENTS, JOB_TYPES, QUEUES } from "@growvisi/shared";
import { isProductionDeploy } from "../../config/production";
import { useBackgroundWorkers } from "../../config/workers";
import { WEBHOOK_ACK_ENQUEUE_TIMEOUT_MS } from "../../config/webhook-ack";
import { deferBackgroundTask } from "../../common/utils/defer-background";
import { JobsService } from "../jobs/jobs.service";
import { withTimeout } from "../../common/utils/with-timeout";
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
        event?: string;
        phone_number?: string;
        phone_number_id?: string;
        display_phone_number?: string;
        verified_name?: string;
        ban_info?: { waba_ban_state?: string; waba_ban_date?: string };
        violation_info?: { violation_type?: string };
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
  contactPhone: string;
  waMessageId: string;
  direction: "INBOUND";
  content: string | null;
  createdAt: string;
  type: string;
}

import { AiClassifyService } from "../ai/ai-classify.service";
import { BusinessEventService } from "../events/business-event.service";
import { AssignmentService } from "../assignments/assignment.service";
import { TrackingService } from "../tracking/tracking.service";
import { WebhookDispatchService } from "../webhooks/webhook-dispatch.service";
import {
  mapInboundMessageStatusToCampaignStatus,
  shouldAdvanceCampaignRecipientStatus,
} from "./campaign-delivery.util";
import { EntitlementsService } from "../billing/entitlements.service";
import { attributeInboundCampaignReply } from "../campaigns/campaign-reply-attribution";
import {
  isCampaignOptOutMessage,
  withCampaignOptOutProfile,
} from "../campaigns/campaign-opt-out";
import {
  RealtimeGateway,
  type MessageStatusEvent,
} from "../realtime/realtime.gateway";

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUES.WHATSAPP_INBOUND) private readonly inboundQueue: Queue,
    private readonly jobs: JobsService,
    private readonly aiClassify: AiClassifyService,
    private readonly realtime: RealtimeGateway,
    private readonly entitlements: EntitlementsService,
    private readonly assignments: AssignmentService,
    private readonly tracking: TrackingService,
    private readonly webhooks: WebhookDispatchService,
    private readonly businessEvents: BusinessEventService,
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

    this.scheduleWebhookProcessing(event.id, payload);

    return { received: true, eventId: event.id };
  }

  /** ACK path only — never await heavy processing here. */
  scheduleWebhookProcessing(eventId: string, payload: WhatsappWebhookPayload): void {
    const runInline = () => this.processInline(eventId, payload);

    // Local worker host (BullMQ): enqueue to Redis, defer on failure.
    if (useBackgroundWorkers()) {
      const jobId = createHash("sha256")
        .update(JSON.stringify({ id: eventId, entry: payload.entry }))
        .digest("hex");

      void this.tryEnqueueWebhook(eventId, payload, jobId).catch((err) => {
        this.logger.warn(
          `Webhook ${eventId} enqueue failed (${err instanceof Error ? err.message : err}) — processing via defer`,
        );
        deferBackgroundTask(runInline);
      });
      return;
    }

    // Serverless: durable QStash job (retries/backoff/DLQ), inline fallback.
    this.jobs.enqueue(
      JOB_TYPES.WHATSAPP_INBOUND,
      { webhookEventId: eventId, payload },
      runInline,
      {
        deduplicationId: createHash("sha256")
          .update(JSON.stringify({ id: eventId, entry: payload.entry }))
          .digest("hex"),
      },
    );
  }

  /** QStash callback entrypoint — runs the same processing as the inline fallback. */
  async processWebhookJob(eventId: string, payload: WhatsappWebhookPayload): Promise<void> {
    await this.processInline(eventId, payload);
  }

  private async tryEnqueueWebhook(
    eventId: string,
    payload: WhatsappWebhookPayload,
    jobId: string,
  ): Promise<void> {
    await withTimeout(
      this.inboundQueue.add(
        "process",
        { webhookEventId: eventId, payload },
        { jobId, removeOnComplete: 1000, removeOnFail: 5000 },
      ),
      WEBHOOK_ACK_ENQUEUE_TIMEOUT_MS,
      "Queue unavailable",
    );
  }

  private async processInline(eventId: string, payload: WhatsappWebhookPayload) {
    try {
      const events = await this.processWebhookPayload(payload);
      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          processedAt: new Date(),
          organizationId: events[0]?.organizationId ?? undefined,
        },
      });

      // Emit ALL realtime events FIRST, then enqueue AI classification.
      // This decouples message visibility from AI processing — customers see
      // messages instantly instead of waiting for classification to finish.
      for (const inbound of events) {
        this.realtime.emitMessageNew(inbound.organizationId, {
          conversationId: inbound.conversationId,
          messageId: inbound.messageId,
          direction: inbound.direction,
          content: inbound.content,
          createdAt: inbound.createdAt,
          type: inbound.type,
        });
      }

      // Enqueue AI classification. On Vercel without QStash, nested waitUntil
      // calls from within a deferred task can silently drop — the inner promise
      // isn't tracked by the outer waitUntil scope. Run classification INLINE
      // (awaited) when we're already inside a deferred task so the full pipeline
      // completes before the function terminates.
      for (const inbound of events) {
        const correlationId = this.businessEvents.createCorrelationId();
        void this.businessEvents.emit({
          organizationId: inbound.organizationId,
          type: DOMAIN_EVENTS.MESSAGE_RECEIVED,
          entityType: "message",
          entityId: inbound.messageId,
          correlationId,
          payload: {
            conversationId: inbound.conversationId,
            leadId: inbound.leadId,
            waMessageId: inbound.waMessageId,
            contactPhone: inbound.contactPhone,
          },
        });

        await this.aiClassify.enqueue(
          {
            organizationId: inbound.organizationId,
            conversationId: inbound.conversationId,
            messageId: inbound.messageId,
            ...(inbound.leadId ? { leadId: inbound.leadId } : {}),
            correlationId,
          },
          { background: false },
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Inline webhook processing failed: ${message}`);
      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: { error: message },
      }).catch(() => {});
      // Rethrow so QStash/BullMQ can retry on transient failures.
      throw err;
    }
  }

  /** Process message + account_update webhook fields. */
  async processWebhookPayload(payload: WhatsappWebhookPayload): Promise<InboundMessageEvent[]> {
    const events = await this.processInboundPayload(payload);
    await this.processAccountUpdates(payload);
    return events;
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

  /** Meta account_update — phone verification, restrictions, async Embedded Signup completion. */
  private async processAccountUpdates(payload: WhatsappWebhookPayload) {
    for (const entry of payload.entry ?? []) {
      const wabaId = entry.id;
      if (!wabaId) continue;

      for (const change of entry.changes ?? []) {
        if (change.field !== "account_update") continue;

        const value = change.value;
        const event = value.event?.trim();
        if (!event) continue;

        const phoneNumberId = value.phone_number_id ?? value.metadata?.phone_number_id;
        const accounts = await this.prisma.whatsappAccount.findMany({
          where: { wabaId, isActive: true },
        });

        if (accounts.length === 0) {
          this.logger.warn(
            `account_update ${event} for WABA ${wabaId} — no active Growvisi account matched`,
          );
          continue;
        }

        for (const account of accounts) {
          const metadata = {
            ...((account.metadata ?? {}) as Record<string, unknown>),
            lastAccountUpdate: {
              event,
              at: new Date().toISOString(),
              phoneNumberId: phoneNumberId ?? null,
              displayPhoneNumber: value.display_phone_number ?? value.phone_number ?? null,
              verifiedName: value.verified_name ?? null,
              banInfo: value.ban_info ?? null,
              violationInfo: value.violation_info ?? null,
            },
          };

          const data: {
            metadata: object;
            displayPhoneNumber?: string;
            verifiedName?: string;
          } = { metadata };

          if (
            phoneNumberId &&
            (event === "PHONE_NUMBER_ADDED" || event === "VERIFIED_ACCOUNT") &&
            account.phoneNumberId === phoneNumberId
          ) {
            if (value.display_phone_number) {
              data.displayPhoneNumber = value.display_phone_number;
            } else if (value.phone_number) {
              data.displayPhoneNumber = value.phone_number;
            }
            if (value.verified_name) {
              data.verifiedName = value.verified_name;
            }
          }

          await this.prisma.whatsappAccount.update({
            where: { id: account.id },
            data,
          });

          this.realtime.emitWhatsappSetupUpdated(account.organizationId, {
            event,
            wabaId,
            phoneNumberId: phoneNumberId ?? undefined,
          });
          this.realtime.emitInboxUpdated(account.organizationId);

          this.logger.log(
            `account_update ${event} applied for org=${account.organizationId} waba=${wabaId}`,
          );
        }
      }
    }
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

    let waTimestamp = new Date();
    if (msg.timestamp) {
      const parsed = new Date(Number(msg.timestamp) * 1000);
      const now = Date.now();
      if (!isNaN(parsed.getTime()) && parsed.getTime() > 0 && parsed.getTime() <= now + 60_000) {
        waTimestamp = parsed;
      }
    }

    const existing = await this.prisma.message.findUnique({
      where: { organizationId_waMessageId: { organizationId, waMessageId } },
    });
    if (existing) return null;

    const isReaction = String(msg.type ?? "text") === "reaction";
    const type = this.mapMessageType(String(msg.type ?? "text"));
    const content = this.extractContent(msg);

    let conversation: { id: string; leadId: string | null };
    let message: { id: string; createdAt: Date };
    let lead: {
      id: string;
      phone: string;
      displayName: string | null;
      stage: string;
      profile: unknown;
    } | null;
    let isNewLead = false;

    try {
      const txResult = await this.prisma.$transaction(async (tx) => {
        const conv = await tx.conversation.upsert({
          where: {
            organizationId_waConversationKey: { organizationId, waConversationKey },
          },
          create: {
            organizationId,
            whatsappAccountId,
            waConversationKey,
            contactPhone: from,
            contactName,
            aiEnabled: true,
            lastMessageAt: waTimestamp,
            lastInboundAt: waTimestamp,
            unreadCount: isReaction ? 0 : 1,
          },
          update: {
            contactName: contactName ?? undefined,
            lastMessageAt: waTimestamp,
            lastInboundAt: waTimestamp,
            ...(isReaction ? {} : { unreadCount: { increment: 1 } }),
          },
        });

        const msgRow = await tx.message.create({
          data: {
            organizationId,
            conversationId: conv.id,
            waMessageId,
            direction: "INBOUND",
            type,
            status: "DELIVERED",
            content,
            payload: msg as object,
            createdAt: waTimestamp,
          },
        });

        let leadRow = await tx.lead.findUnique({
          where: { organizationId_phone: { organizationId, phone: from } },
        });

        let createdLead = false;
        let capSkipped = false;

        if (leadRow) {
          if (contactName && contactName !== leadRow.displayName) {
            leadRow = await tx.lead.update({
              where: { id: leadRow.id },
              data: { displayName: contactName },
            });
          }
        } else if (await this.entitlements.canCreateLead(organizationId)) {
          leadRow = await tx.lead.create({
            data: {
              organizationId,
              phone: from,
              displayName: contactName,
              stage: "NEW",
            },
          });
          createdLead = true;
        } else {
          capSkipped = true;
        }

        if (leadRow && conv.leadId !== leadRow.id) {
          await tx.conversation.update({
            where: { id: conv.id },
            data: { leadId: leadRow.id },
          });
        }

        return {
          conversation: conv,
          message: msgRow,
          lead: leadRow,
          isNewLead: createdLead,
          capSkipped,
        };
      });

      conversation = txResult.conversation;
      message = txResult.message;
      lead = txResult.lead;
      isNewLead = txResult.isNewLead;

      if (txResult.capSkipped) {
        this.logger.warn(
          `Monthly lead cap reached for org=${organizationId} — message stored without new lead`,
        );
        void this.entitlements
          .recordLeadIngestionSkipped(organizationId)
          .catch(() => undefined);
      }
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

    if (lead && typeof content === "string") {
      void this.tracking
        .attributeLeadFromMessage(organizationId, lead.id, content, lead.profile)
        .catch(() => undefined);

      if (isCampaignOptOutMessage(content)) {
        const profile = withCampaignOptOutProfile(lead.profile, true, "keyword");
        void this.prisma.lead
          .update({
            where: { id: lead.id },
            data: { profile: profile as object },
          })
          .catch(() => undefined);
      }
    }

    if (!isReaction) {
      void attributeInboundCampaignReply(this.prisma, {
        organizationId,
        whatsappAccountId,
        contactPhone: from,
        conversationId: conversation.id,
        messageId: message.id,
        leadId: lead?.id ?? null,
      }).catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Campaign reply attribution failed: ${msg}`);
      });
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

    // Auto-assign is not needed to render the message bubble. Keep it OFF the
    // realtime critical path so `message.new` reaches clients immediately; the
    // assignment badge reconciles on the next thread open / inbox.updated / poll.
    const assignConversationId = conversation.id;
    const assignLeadId = lead?.id ?? null;
    deferBackgroundTask(async () => {
      try {
        const assignee = await this.assignments.applyAutoAssign(organizationId, {
          conversationId: assignConversationId,
          leadId: assignLeadId,
          reason: "new_inbound",
        });
        if (assignee) {
          this.realtime.emitInboxUpdated(organizationId, assignConversationId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Auto-assign failed for conversation ${assignConversationId}: ${message}`);
      }
    });

    return {
      organizationId,
      conversationId: conversation.id,
      messageId: message.id,
      leadId: lead?.id ?? null,
      contactPhone: from,
      waMessageId,
      direction: "INBOUND" as const,
      content,
      createdAt: message.createdAt.toISOString(),
      type,
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
      select: { id: true, status: true, conversationId: true },
    });

    if (!existing) return;

    const currentRank = WhatsappService.STATUS_RANK[existing.status] ?? 0;
    const newRank = WhatsappService.STATUS_RANK[mapped] ?? 0;

    if (mapped === "FAILED" || newRank > currentRank) {
      const errorMessage =
        mapped === "FAILED" ? extractWhatsappStatusError(status) : undefined;
      await this.prisma.message.updateMany({
        where: { organizationId, waMessageId },
        data: {
          status: mapped as never,
          ...(errorMessage ? { errorMessage } : {}),
        },
      });
      await this.updateCampaignRecipientStatus(organizationId, waMessageId, mapped);

      // Push the status change so open threads update their ticks instantly.
      // Ticks also reconcile via the thread poll, so a missed broadcast is not fatal.
      this.realtime.emitMessageStatusUpdated(organizationId, {
        conversationId: existing.conversationId,
        messageId: existing.id,
        status: mapped as MessageStatusEvent["status"],
      });
    }
  }

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

    const campaignStatus = mapInboundMessageStatusToCampaignStatus(mapped);
    if (!campaignStatus) return;

    if (!shouldAdvanceCampaignRecipientStatus(recipient.status, campaignStatus)) return;

    // Atomic: recipient status and the campaign's aggregate counter move
    // together so delivered/failed counts can't drift under concurrent webhooks.
    await this.prisma.$transaction(async (tx) => {
      await tx.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: campaignStatus as never },
      });

      if (campaignStatus === "DELIVERED") {
        await tx.campaign.update({
          where: { id: recipient.campaignId },
          data: { deliveredCount: { increment: 1 } },
        });
      } else if (campaignStatus === "FAILED" && recipient.status !== "FAILED") {
        await tx.campaign.update({
          where: { id: recipient.campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }
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

  private extractContent(msg: Record<string, unknown>): string | null {
    const text = this.extractText(msg);
    if (text) return text;

    const type = String(msg.type ?? "text");
    if (type === "reaction") {
      const reaction = msg.reaction as { emoji?: string } | undefined;
      const emoji = reaction?.emoji?.trim();
      return emoji ? emoji : "[Reaction]";
    }

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

/** Pull a human-readable reason out of a Meta message-status FAILED webhook. */
function extractWhatsappStatusError(
  status: Record<string, unknown>,
): string | undefined {
  const errors = status.errors;
  if (!Array.isArray(errors) || errors.length === 0) return undefined;
  const first = errors[0] as Record<string, unknown> | undefined;
  if (!first) return undefined;
  const errorData = first.error_data as { details?: unknown } | undefined;
  const detail =
    (typeof errorData?.details === "string" && errorData.details) ||
    (typeof first.title === "string" && first.title) ||
    (typeof first.message === "string" && first.message) ||
    undefined;
  return detail ? String(detail).slice(0, 500) : undefined;
}
