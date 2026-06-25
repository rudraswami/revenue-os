import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
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
  audience: AudienceFilter;
}

@Injectable()
export class CampaignsService {
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

  async previewAudience(user: JwtPayload, audience: AudienceFilter) {
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

  async list(user: JwtPayload) {
    return this.prisma.campaign.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async get(user: JwtPayload, id: string) {
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
    await this.entitlements.assertHasAccess(user.organizationId);
    const name = input.name.trim();
    if (!name) throw new BadRequestException("Campaign name required");

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
        status: "DRAFT",
        templateName: input.templateName?.trim() || null,
        messageBody: input.messageBody?.slice(0, 1024) || null,
        audienceFilter: input.audience as object,
        totalRecipients: leads.length,
        createdById: user.sub,
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
   * customers and never bypasses Meta's policy. A template name is mandatory.
   */
  async send(user: JwtPayload, id: string) {
    await this.entitlements.assertHasAccess(user.organizationId);

    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId: user.organizationId },
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
      where: { organizationId: user.organizationId, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (!account) {
      throw new BadRequestException("Connect an active WhatsApp number before sending campaigns.");
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId: id, status: "PENDING" },
    });

    const languageCode = "en";
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        await this.messaging.sendTemplate(
          account,
          recipient.phone,
          campaign.templateName,
          languageCode,
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
