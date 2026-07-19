import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import type { JwtPayload, LeadStage } from "@growvisi/shared";
import { QUEUES } from "@growvisi/shared";
import { deferBackgroundTask } from "../../common/utils/defer-background";
import { withTimeout } from "../../common/utils/with-timeout";
import { useBackgroundWorkers } from "../../config/workers";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { WhatsappMessagingService } from "../whatsapp/whatsapp-messaging.service";
import {
  aggregateCampaignRecipientStats,
  recipientStatsToProgress,
} from "./campaign-recipient-stats";
import { buildCampaignRecipientsCsv } from "./campaign-csv.util";
import { readCampaignOptOut } from "./campaign-opt-out";
import {
  loadOptedOutPhones,
  recipientStatusForOptOut,
} from "./campaign-recipient-opt-out";

const SEND_BATCH_SIZE = 25;
const SEND_MESSAGE_DELAY_MS = 100;
const SEND_BATCH_PAUSE_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface AudienceFilter {
  stages?: LeadStage[];
  tagIds?: string[];
  minScore?: number;
}

export interface CreateCampaignInput {
  name: string;
  templateName?: string | null;
  languageCode?: string;
  messageBody?: string | null;
  templateParams?: string[];
  audience: AudienceFilter;
  scheduledAt?: string | null;
  whatsappAccountId?: string | null;
}

export interface ImportCampaignInput {
  name: string;
  templateName: string;
  languageCode?: string;
  messageBody?: string | null;
  templateParams?: string[];
  recipients: Array<{ phone: string; name?: string | null }>;
  scheduledAt?: string | null;
  whatsappAccountId?: string | null;
}

const MIN_SCHEDULE_MS = 5 * 60_000;
const MAX_SCHEDULE_MS = 90 * 24 * 60 * 60_000;

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly messaging: WhatsappMessagingService,
    @InjectQueue(QUEUES.CAMPAIGN_SEND) private readonly sendQueue: Queue,
  ) {}

  private buildLeadWhere(organizationId: string, audience: AudienceFilter) {
    const where: Record<string, unknown> = { organizationId };
    if (audience.stages?.length) where.stage = { in: audience.stages };
    if (audience.minScore != null) where.score = { gte: audience.minScore };
    if (audience.tagIds?.length) {
      where.tags = { some: { tagId: { in: audience.tagIds } } };
    }
    return where;
  }

  private parseScheduledAt(raw: string | null | undefined): Date | null {
    if (!raw?.trim()) return null;
    const at = new Date(raw);
    if (Number.isNaN(at.getTime())) {
      throw new BadRequestException("Invalid schedule time.");
    }
    const delta = at.getTime() - Date.now();
    if (delta < MIN_SCHEDULE_MS) {
      throw new BadRequestException("Schedule at least 5 minutes from now.");
    }
    if (delta > MAX_SCHEDULE_MS) {
      throw new BadRequestException("Campaigns can be scheduled up to 90 days ahead.");
    }
    return at;
  }

  private async assertCampaignMutable(
    organizationId: string,
    id: string,
    allowed: Array<"DRAFT" | "SCHEDULED" | "FAILED">,
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });
    if (!campaign) throw new NotFoundException();
    if (!allowed.includes(campaign.status as "DRAFT" | "SCHEDULED" | "FAILED")) {
      throw new BadRequestException(`Campaign cannot be modified while ${campaign.status.toLowerCase()}.`);
    }
    return campaign;
  }

  async previewAudience(user: JwtPayload, audience: AudienceFilter) {
    await this.assertCampaignsPlan(user.organizationId);
    const where = this.buildLeadWhere(user.organizationId, audience);
    const [count, sample, optOutCount] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        take: 8,
        orderBy: { updatedAt: "desc" },
        select: { id: true, displayName: true, phone: true, stage: true, score: true },
      }),
      this.prisma.lead.count({
        where: {
          ...where,
          profile: { path: ["campaignOptOut"], equals: true },
        },
      }),
    ]);
    return { count, sample, optOutCount, sendableCount: Math.max(0, count - optOutCount) };
  }

  private async assertCampaignsPlan(organizationId: string) {
    await this.entitlements.assertPlanAtLeast(organizationId, "growth");
  }

  async list(user: JwtPayload) {
    await this.assertCampaignsPlan(user.organizationId);
    const rows = await this.prisma.campaign.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    return rows.map((c) => ({
      ...c,
      deliveryPct:
        c.totalRecipients > 0 && c.sentCount > 0
          ? Math.round((c.deliveredCount / c.totalRecipients) * 100)
          : 0,
      replyRatePct:
        c.deliveredCount > 0 ? Math.round((c.replyCount / c.deliveredCount) * 100) : 0,
    }));
  }

  async exportRecipientsCsv(user: JwtPayload, id: string): Promise<string> {
    await this.assertCampaignsPlan(user.organizationId);
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true, name: true },
    });
    if (!campaign) throw new NotFoundException();

    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: "asc" },
      select: {
        phone: true,
        name: true,
        status: true,
        error: true,
        sentAt: true,
        repliedAt: true,
        conversationId: true,
      },
    });

    return buildCampaignRecipientsCsv(recipients);
  }

  async get(user: JwtPayload, id: string) {
    await this.assertCampaignsPlan(user.organizationId);
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!campaign) throw new NotFoundException();

    const [deliveryStats, recipients] = await Promise.all([
      aggregateCampaignRecipientStats(this.prisma, id),
      this.prisma.campaignRecipient.findMany({
        where: { campaignId: id },
        orderBy: { createdAt: "asc" },
        take: 500,
      }),
    ]);

    return {
      ...campaign,
      recipients,
      readCount: deliveryStats.read,
      replyCount: campaign.replyCount,
      replyRatePct:
        deliveryStats.delivered + deliveryStats.read > 0
          ? Math.round(
              (deliveryStats.replied / (deliveryStats.delivered + deliveryStats.read)) * 100,
            )
          : 0,
      deliveryStats,
      recipientsTruncated: campaign.totalRecipients > recipients.length,
    };
  }

  async getReplyMetrics(user: JwtPayload, period?: string) {
    await this.assertCampaignsPlan(user.organizationId);
    const orgId = user.organizationId;
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60_000);

    const [campaigns, recentReplies] = await Promise.all([
      this.prisma.campaign.findMany({
        where: {
          organizationId: orgId,
          status: { in: ["COMPLETED", "RUNNING"] },
          OR: [{ completedAt: { gte: since } }, { startedAt: { gte: since } }],
        },
        select: {
          id: true,
          name: true,
          replyCount: true,
          deliveredCount: true,
          completedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      this.prisma.campaignRecipient.count({
        where: {
          repliedAt: { gte: since },
          campaign: { organizationId: orgId },
        },
      }),
    ]);

    const totalReplies = campaigns.reduce((sum, c) => sum + c.replyCount, 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + c.deliveredCount, 0);

    return {
      periodDays: days,
      totalReplies: Math.max(totalReplies, recentReplies),
      replyRatePct:
        totalDelivered > 0 ? Math.round((totalReplies / totalDelivered) * 100) : 0,
      topCampaigns: campaigns
        .filter((c) => c.replyCount > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          replyCount: c.replyCount,
          replyRatePct:
            c.deliveredCount > 0
              ? Math.round((c.replyCount / c.deliveredCount) * 100)
              : 0,
        })),
    };
  }

  async getProgress(user: JwtPayload, id: string) {
    await this.assertCampaignsPlan(user.organizationId);
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId: user.organizationId },
      select: {
        id: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        deliveredCount: true,
        failedCount: true,
        startedAt: true,
        completedAt: true,
      },
    });
    if (!campaign) throw new NotFoundException();

    const stats = await aggregateCampaignRecipientStats(this.prisma, id);
    return {
      ...campaign,
      ...recipientStatsToProgress(campaign.totalRecipients, stats),
    };
  }

  async retryFailed(user: JwtPayload, id: string) {
    await this.assertCampaignsPlan(user.organizationId);
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!campaign) throw new NotFoundException();
    if (campaign.status === "RUNNING") {
      throw new BadRequestException("Campaign is still sending.");
    }
    if (!campaign.templateName) {
      throw new BadRequestException("Campaign has no template configured.");
    }

    const reset = await this.prisma.campaignRecipient.updateMany({
      where: { campaignId: id, status: "FAILED" },
      data: { status: "PENDING", error: null },
    });
    if (reset.count === 0) {
      throw new BadRequestException("No failed recipients to retry.");
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { status: "RUNNING", completedAt: null },
    });

    await this.enqueueSendWork(user.organizationId, id);
    return this.getProgress(user, id);
  }

  private async resolveWhatsappAccount(organizationId: string, whatsappAccountId?: string | null) {
    if (whatsappAccountId) {
      const account = await this.prisma.whatsappAccount.findFirst({
        where: { id: whatsappAccountId, organizationId, isActive: true },
      });
      if (!account) {
        throw new BadRequestException("Selected WhatsApp number is not active.");
      }
      return account;
    }
    const account = await this.prisma.whatsappAccount.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (!account) {
      throw new BadRequestException("Connect an active WhatsApp number before sending campaigns.");
    }
    return account;
  }

  async create(user: JwtPayload, input: CreateCampaignInput) {
    await this.assertCampaignsPlan(user.organizationId);
    const name = input.name.trim();
    if (!name) throw new BadRequestException("Campaign name required");
    if (!input.templateName?.trim()) {
      throw new BadRequestException("Select an approved WhatsApp template before saving.");
    }

    const scheduledAt = this.parseScheduledAt(input.scheduledAt);

    const where = this.buildLeadWhere(user.organizationId, input.audience);
    const access = await this.entitlements.getAccess(user.organizationId);
    const maxPerSend = access.limits.maxCampaignRecipientsPerSend || 5000;
    const leads = await this.prisma.lead.findMany({
      where,
      select: { id: true, displayName: true, phone: true, profile: true },
      take: maxPerSend,
    });
    if (leads.length === 0) {
      throw new BadRequestException("No contacts match this audience. Adjust the filters.");
    }

    await this.entitlements.assertCampaignPerSendLimit(
      user.organizationId,
      leads.length,
    );

    const optedOutPhones = await loadOptedOutPhones(
      this.prisma,
      user.organizationId,
      leads.map((l) => l.phone),
    );

    return this.prisma.campaign.create({
      data: {
        organizationId: user.organizationId,
        whatsappAccountId: input.whatsappAccountId ?? null,
        name: name.slice(0, 120),
        status: scheduledAt ? "SCHEDULED" : "DRAFT",
        templateName: input.templateName?.trim() || null,
        messageBody: input.messageBody?.slice(0, 1024) || null,
        audienceFilter: {
          ...input.audience,
          languageCode: input.languageCode ?? "en",
          templateParams: input.templateParams ?? [],
        } as object,
        totalRecipients: leads.length,
        createdById: user.sub,
        scheduledAt,
        recipients: {
          create: leads.map((l) => {
            const { status, error } = recipientStatusForOptOut(l.phone, optedOutPhones);
            return {
              leadId: l.id,
              phone: l.phone,
              name: l.displayName,
              status,
              error,
            };
          }),
        },
      },
      include: { recipients: { take: 50 } },
    });
  }

  async createFromImport(user: JwtPayload, input: ImportCampaignInput) {
    await this.assertCampaignsPlan(user.organizationId);
    const name = input.name.trim();
    const templateName = input.templateName.trim();
    if (!name) throw new BadRequestException("Campaign name required");
    if (!templateName) throw new BadRequestException("Template name required for imported campaigns.");

    const scheduledAt = this.parseScheduledAt(input.scheduledAt);

    const normalized = input.recipients
      .map((r) => ({
        phone: r.phone.replace(/\D/g, ""),
        name: r.name?.trim() || null,
      }))
      .filter((r) => r.phone.length >= 10);

    if (normalized.length === 0) {
      throw new BadRequestException("No valid phone numbers in import.");
    }

    const access = await this.entitlements.getAccess(user.organizationId);
    const maxPerSend = access.limits.maxCampaignRecipientsPerSend || 5000;
    if (normalized.length > maxPerSend) {
      throw new BadRequestException(
        `Maximum ${maxPerSend.toLocaleString("en-IN")} recipients per campaign on your plan.`,
      );
    }

    const unique = new Map<string, { phone: string; name: string | null }>();
    for (const r of normalized) {
      if (!unique.has(r.phone)) unique.set(r.phone, r);
    }

    const recipientRows: Array<{ leadId?: string; phone: string; name: string | null }> = [];
    for (const r of unique.values()) {
      let lead = await this.prisma.lead.findUnique({
        where: { organizationId_phone: { organizationId: user.organizationId, phone: r.phone } },
        select: { id: true, displayName: true },
      });
      if (!lead && (await this.entitlements.canCreateLead(user.organizationId))) {
        lead = await this.prisma.lead.create({
          data: {
            organizationId: user.organizationId,
            phone: r.phone,
            displayName: r.name,
            source: "import",
          },
          select: { id: true, displayName: true },
        });
      }
      recipientRows.push({
        leadId: lead?.id,
        phone: r.phone,
        name: r.name ?? lead?.displayName ?? null,
      });
    }

    await this.entitlements.assertCampaignPerSendLimit(
      user.organizationId,
      recipientRows.length,
    );

    const optedOutPhones = await loadOptedOutPhones(
      this.prisma,
      user.organizationId,
      recipientRows.map((r) => r.phone),
    );

    return this.prisma.campaign.create({
      data: {
        organizationId: user.organizationId,
        whatsappAccountId: input.whatsappAccountId ?? null,
        name: name.slice(0, 120),
        status: scheduledAt ? "SCHEDULED" : "DRAFT",
        templateName,
        messageBody: input.messageBody?.slice(0, 1024) || null,
        audienceFilter: {
          source: "csv_import",
          languageCode: input.languageCode ?? "en",
          templateParams: input.templateParams ?? [],
        } as object,
        totalRecipients: recipientRows.length,
        createdById: user.sub,
        scheduledAt,
        recipients: {
          create: recipientRows.map((r) => {
            const { status, error } = recipientStatusForOptOut(r.phone, optedOutPhones);
            return {
              leadId: r.leadId,
              phone: r.phone,
              name: r.name,
              status,
              error,
            };
          }),
        },
      },
      include: { recipients: { take: 50 } },
    });
  }

  async schedule(user: JwtPayload, id: string, scheduledAtRaw: string) {
    await this.assertCampaignsPlan(user.organizationId);
    await this.entitlements.assertHasAccess(user.organizationId);
    const campaign = await this.assertCampaignMutable(user.organizationId, id, [
      "DRAFT",
      "FAILED",
    ]);
    if (!campaign.templateName) {
      throw new BadRequestException("Add an approved template before scheduling.");
    }
    const scheduledAt = this.parseScheduledAt(scheduledAtRaw);
    return this.prisma.campaign.update({
      where: { id },
      data: { status: "SCHEDULED", scheduledAt },
    });
  }

  async cancelSchedule(user: JwtPayload, id: string) {
    const campaign = await this.assertCampaignMutable(user.organizationId, id, ["SCHEDULED"]);
    return this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "DRAFT", scheduledAt: null },
    });
  }

  async remove(user: JwtPayload, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true, status: true },
    });
    if (!campaign) throw new NotFoundException();
    if (campaign.status === "RUNNING") {
      throw new BadRequestException("Cannot delete a running campaign.");
    }
    await this.prisma.campaign.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Send the campaign via Meta WhatsApp message templates. Outbound business-
   * initiated messages REQUIRE a pre-approved template — Growvisi never spams
   * customers and never bypasses Meta's policy.
   */
  async send(user: JwtPayload, id: string) {
    await this.assertCampaignsPlan(user.organizationId);
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!campaign) throw new NotFoundException();
    if (campaign.status === "RUNNING") {
      throw new BadRequestException("Campaign is already sending.");
    }
    if (campaign.status === "COMPLETED") {
      throw new BadRequestException(
        "Campaign already completed. Retry failed recipients if needed.",
      );
    }
    await this.startSend(user.organizationId, id);
    return this.getProgress(user, id);
  }

  async processDueScheduledCampaigns() {
    const due = await this.prisma.campaign.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    });

    const results: Array<{ id: string; organizationId: string; ok: boolean; error?: string }> =
      [];

    for (const campaign of due) {
      try {
        await this.entitlements.assertHasAccess(campaign.organizationId);
        await this.assertCampaignsPlan(campaign.organizationId);
        await this.startSend(campaign.organizationId, campaign.id);
        results.push({ id: campaign.id, organizationId: campaign.organizationId, ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Send failed";
        this.logger.warn(`Scheduled campaign ${campaign.id} failed: ${message}`);
        await this.prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: "FAILED", completedAt: new Date() },
        });
        results.push({
          id: campaign.id,
          organizationId: campaign.organizationId,
          ok: false,
          error: message,
        });
      }
    }

    return { processed: results.length, results };
  }

  /** Claim RUNNING and enqueue background batched send. */
  async startSend(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });
    if (!campaign) throw new NotFoundException();
    if (campaign.status === "RUNNING" || campaign.status === "COMPLETED") {
      throw new BadRequestException("Campaign already sent or in progress.");
    }
    if (!campaign.templateName) {
      throw new BadRequestException(
        "Add an approved WhatsApp template name before sending. Meta requires templates for outbound messages.",
      );
    }

    const pendingCount = await this.prisma.campaignRecipient.count({
      where: { campaignId: id, status: "PENDING" },
    });
    await this.entitlements.assertCampaignMonthlySendCapacity(
      organizationId,
      pendingCount > 0 ? pendingCount : campaign.totalRecipients,
    );

    const claimed = await this.prisma.campaign.updateMany({
      where: {
        id,
        organizationId,
        status: { in: ["DRAFT", "SCHEDULED", "FAILED"] },
      },
      data: { status: "RUNNING", startedAt: new Date(), scheduledAt: null },
    });
    if (claimed.count === 0) {
      throw new BadRequestException("Campaign is already being sent.");
    }

    await this.enqueueSendWork(organizationId, id);
  }

  private async enqueueSendWork(organizationId: string, campaignId: string) {
    const run = () => this.runSendUntilDone(organizationId, campaignId);

    if (!useBackgroundWorkers()) {
      deferBackgroundTask(run);
      return;
    }

    try {
      await withTimeout(
        this.sendQueue.add(
          "send",
          { organizationId, campaignId },
          {
            jobId: `campaign-send:${campaignId}`,
            removeOnComplete: 500,
            removeOnFail: 2000,
            attempts: 2,
          },
        ),
        5_000,
        "Campaign send queue unavailable",
      );
    } catch {
      deferBackgroundTask(run);
    }
  }

  /** Process all pending recipients in batches (worker or deferred task). */
  async runSendUntilDone(organizationId: string, campaignId: string) {
    try {
      let hasMore = true;
      while (hasMore) {
        hasMore = !(await this.processSendBatch(organizationId, campaignId));
        if (hasMore) await sleep(SEND_BATCH_PAUSE_MS);
      }
      await this.finalizeCampaignIfDone(organizationId, campaignId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Send failed";
      this.logger.error(`Campaign ${campaignId} send loop failed: ${message}`);
      await this.prisma.campaign.updateMany({
        where: { id: campaignId, organizationId, status: "RUNNING" },
        data: { status: "FAILED", completedAt: new Date() },
      });
      throw err;
    }
  }

  /** @returns true when no pending recipients remain */
  private async processSendBatch(
    organizationId: string,
    campaignId: string,
  ): Promise<boolean> {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });
    if (!campaign || campaign.status !== "RUNNING") return true;
    if (!campaign.templateName) return true;

    const account = await this.resolveWhatsappAccount(
      organizationId,
      campaign.whatsappAccountId,
    );

    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId, status: "PENDING" },
      take: SEND_BATCH_SIZE,
      orderBy: { createdAt: "asc" },
    });
    if (recipients.length === 0) return true;

    const optedOutPhones = await loadOptedOutPhones(
      this.prisma,
      organizationId,
      recipients.map((r) => r.phone),
    );

    const filter = (campaign.audienceFilter ?? {}) as Record<string, unknown>;
    const languageCode = typeof filter.languageCode === "string" ? filter.languageCode : "en";
    const storedParams = Array.isArray(filter.templateParams)
      ? filter.templateParams.map(String)
      : [];
    const bodyParams =
      storedParams.length > 0
        ? storedParams
        : campaign.messageBody?.trim()
          ? [campaign.messageBody.trim()]
          : [];

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const recipient of recipients) {
      const { status: skipStatus, error: skipError } = recipientStatusForOptOut(
        recipient.phone,
        optedOutPhones,
      );
      if (skipStatus === "SKIPPED") {
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "SKIPPED", error: skipError },
        });
        skipped += 1;
        continue;
      }

      try {
        const waMessageId = await this.messaging.sendTemplate(
          account,
          recipient.phone,
          campaign.templateName,
          languageCode,
          bodyParams,
        );
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "SENT", sentAt: new Date(), error: null, waMessageId },
        });
        sent += 1;
      } catch (err) {
        failed += 1;
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "FAILED",
            error: err instanceof Error ? err.message.slice(0, 300) : "Send failed",
          },
        });
      }
      await sleep(SEND_MESSAGE_DELAY_MS);
    }

    if (sent > 0 || failed > 0) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: sent },
          failedCount: { increment: failed },
        },
      });
    }

    const remaining = await this.prisma.campaignRecipient.count({
      where: { campaignId, status: "PENDING" },
    });
    return remaining === 0;
  }

  private async finalizeCampaignIfDone(organizationId: string, campaignId: string) {
    const pending = await this.prisma.campaignRecipient.count({
      where: { campaignId, status: "PENDING" },
    });
    if (pending > 0) return;

    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    });
    if (!campaign || campaign.status !== "RUNNING") return;

    const stats = await aggregateCampaignRecipientStats(this.prisma, campaignId);
    const successful = stats.sent + stats.delivered + stats.read;
    const status = successful === 0 && stats.failed > 0 ? "FAILED" : "COMPLETED";

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status, completedAt: new Date() },
    });
  }
}
