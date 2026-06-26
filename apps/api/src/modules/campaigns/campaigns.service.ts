import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { JwtPayload, LeadStage } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { WhatsappMessagingService } from "../whatsapp/whatsapp-messaging.service";

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
}

export interface ImportCampaignInput {
  name: string;
  templateName: string;
  languageCode?: string;
  messageBody?: string | null;
  templateParams?: string[];
  recipients: Array<{ phone: string; name?: string | null }>;
  scheduledAt?: string | null;
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
    const [count, sample] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        take: 8,
        orderBy: { updatedAt: "desc" },
        select: { id: true, displayName: true, phone: true, stage: true, score: true },
      }),
    ]);
    return { count, sample };
  }

  private async assertCampaignsPlan(organizationId: string) {
    await this.entitlements.assertPlanAtLeast(organizationId, "growth");
  }

  async list(user: JwtPayload) {
    await this.assertCampaignsPlan(user.organizationId);
    return this.prisma.campaign.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
  }

  async get(user: JwtPayload, id: string) {
    await this.assertCampaignsPlan(user.organizationId);
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        recipients: { take: 200, orderBy: { createdAt: "asc" } },
      },
    });
    if (!campaign) throw new NotFoundException();
    return campaign;
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
    const leads = await this.prisma.lead.findMany({
      where,
      select: { id: true, displayName: true, phone: true },
      take: 5000,
    });
    if (leads.length === 0) {
      throw new BadRequestException("No contacts match this audience. Adjust the filters.");
    }

    return this.prisma.campaign.create({
      data: {
        organizationId: user.organizationId,
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
          create: leads.map((l) => ({
            leadId: l.id,
            phone: l.phone,
            name: l.displayName,
            status: "PENDING" as const,
          })),
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
    if (normalized.length > 5000) {
      throw new BadRequestException("Maximum 5,000 recipients per campaign.");
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

    return this.prisma.campaign.create({
      data: {
        organizationId: user.organizationId,
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
          create: recipientRows.map((r) => ({
            leadId: r.leadId,
            phone: r.phone,
            name: r.name,
            status: "PENDING" as const,
          })),
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
    if (campaign.status === "RUNNING" || campaign.status === "COMPLETED") {
      throw new BadRequestException("Campaign already sent.");
    }
    return this.executeSend(user.organizationId, id);
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
        await this.executeSend(campaign.organizationId, campaign.id);
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

  private async executeSend(organizationId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });
    if (!campaign) throw new NotFoundException();
    if (campaign.status === "RUNNING" || campaign.status === "COMPLETED") {
      throw new BadRequestException("Campaign already sent.");
    }
    if (!campaign.templateName) {
      throw new BadRequestException(
        "Add an approved WhatsApp template name before sending. Meta requires templates for outbound messages.",
      );
    }

    const account = await this.prisma.whatsappAccount.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (!account) {
      throw new BadRequestException("Connect an active WhatsApp number before sending campaigns.");
    }

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

    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId: id, status: "PENDING" },
    });

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

    for (const recipient of recipients) {
      try {
        await this.messaging.sendTemplate(
          account,
          recipient.phone,
          campaign.templateName,
          languageCode,
          bodyParams,
        );
        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "SENT", sentAt: new Date(), error: null },
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
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        status: failed > 0 && sent === 0 ? "FAILED" : "COMPLETED",
        completedAt: new Date(),
        sentCount: { increment: sent },
        failedCount: { increment: failed },
      },
    });
  }
}
