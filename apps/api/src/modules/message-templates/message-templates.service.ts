import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import {
  MESSAGE_TEMPLATE_STARTERS,
  canDeleteTemplate,
  canEditTemplateBody,
  canEditTemplateCategory,
  sanitizeTemplateName,
  validateTemplateBody,
  validateTemplateName,
} from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { WhatsappMessagingService } from "../whatsapp/whatsapp-messaging.service";
import { WhatsappTemplateSyncService } from "../whatsapp/whatsapp-template-sync.service";
import { CreateMessageTemplateDto } from "./dto/create-message-template.dto";
import { UpdateMessageTemplateDto } from "./dto/update-message-template.dto";
import type { DeleteMessageTemplateQueryDto } from "./dto/delete-message-template.dto";

export type TemplateListStatusFilter = "all" | "approved" | "pending" | "rejected";

@Injectable()
export class MessageTemplatesService {
  private readonly logger = new Logger(MessageTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: WhatsappMessagingService,
    private readonly templateSync: WhatsappTemplateSyncService,
    private readonly entitlements: EntitlementsService,
  ) {}

  listStarters() {
    return { starters: MESSAGE_TEMPLATE_STARTERS };
  }

  async list(user: JwtPayload, status: TemplateListStatusFilter = "all") {
    await this.entitlements.assertPlanAtLeast(user.organizationId, "growth");
    const account = await this.resolveActiveAccount(user.organizationId);

    const approvedOnly = status === "approved";
    const templates = await this.messaging.listMessageTemplates(
      account.wabaId,
      account.accessTokenEnc,
      { approvedOnly },
    );

    const filtered =
      status === "all"
        ? templates
        : status === "pending"
          ? templates.filter((t) => t.status === "PENDING" || t.status === "IN_APPEAL")
          : status === "rejected"
            ? templates.filter(
                (t) => t.status === "REJECTED" || t.status === "PAUSED" || t.status === "DISABLED",
              )
            : templates;

    const approved = templates.filter((t) => t.status === "APPROVED").length;
    const pending = templates.filter(
      (t) => t.status === "PENDING" || t.status === "IN_APPEAL",
    ).length;
    const rejected = templates.filter(
      (t) => t.status === "REJECTED" || t.status === "PAUSED" || t.status === "DISABLED",
    ).length;

    return {
      templates: filtered,
      syncedAt: new Date().toISOString(),
      counts: {
        total: templates.length,
        approved,
        pending,
        rejected,
      },
    };
  }

  async create(user: JwtPayload, dto: CreateMessageTemplateDto) {
    await this.entitlements.assertPlanAtLeast(user.organizationId, "growth");
    const account = await this.resolveActiveAccount(user.organizationId);

    const nameResult = validateTemplateName(dto.name);
    if (!nameResult.ok) throw new BadRequestException(nameResult.error);

    const bodyResult = validateTemplateBody(dto.body);
    if (!bodyResult.ok) throw new BadRequestException(bodyResult.error);

    const name = sanitizeTemplateName(dto.name);

    const created = await this.messaging.createMessageTemplate(
      account.wabaId,
      account.accessTokenEnc,
      {
        name,
        language: dto.language,
        category: dto.category,
        body: dto.body.trim(),
      },
    );

    if (dto.starterId) {
      this.logger.log(
        `Template ${name} created from starter ${dto.starterId} for org ${user.organizationId}`,
      );
    }

    void this.templateSync.syncAccountTemplates(account.id);

    return {
      template: created,
      message:
        created.status === "APPROVED"
          ? "Template is approved and ready for campaigns."
          : "Template submitted to WhatsApp for review. Approval usually takes 15 minutes to 24 hours.",
    };
  }

  async sync(user: JwtPayload) {
    await this.entitlements.assertPlanAtLeast(user.organizationId, "growth");
    const account = await this.resolveActiveAccount(user.organizationId);
    const result = await this.templateSync.syncAccountTemplates(account.id);
    if (!result) {
      throw new BadRequestException(
        "Could not sync templates from Meta. Check your access token and WABA permissions.",
      );
    }
    return {
      ok: true,
      ...result,
      syncedAt: new Date().toISOString(),
    };
  }

  async update(user: JwtPayload, dto: UpdateMessageTemplateDto) {
    await this.entitlements.assertPlanAtLeast(user.organizationId, "growth");
    const account = await this.resolveActiveAccount(user.organizationId);
    const name = sanitizeTemplateName(dto.name);

    const existing = await this.findTemplateOnAccount(
      account.wabaId,
      account.accessTokenEnc,
      name,
      dto.language,
    );
    if (!existing) {
      throw new BadRequestException("Template not found on your WhatsApp number.");
    }
    if (!canEditTemplateBody(existing.status)) {
      throw new BadRequestException(
        "Templates under review cannot be edited. Delete and create a new one, or wait for Meta's decision.",
      );
    }

    const bodyResult = validateTemplateBody(dto.body);
    if (!bodyResult.ok) throw new BadRequestException(bodyResult.error);

    if (dto.category && !canEditTemplateCategory(existing.status)) {
      throw new BadRequestException(
        "Category cannot be changed on approved templates. Edit the message body only.",
      );
    }

    const metaTemplateId = dto.metaTemplateId || existing.metaTemplateId;
    if (!metaTemplateId) {
      throw new BadRequestException(
        "Missing Meta template ID. Sync templates from Meta and try again.",
      );
    }

    const updated = await this.messaging.updateMessageTemplate(
      metaTemplateId,
      account.accessTokenEnc,
      {
        body: dto.body.trim(),
        category: canEditTemplateCategory(existing.status) ? dto.category : undefined,
      },
    );

    void this.templateSync.syncAccountTemplates(account.id);

    const statusKey = (updated.status ?? existing.status).toUpperCase();
    const message =
      statusKey === "APPROVED"
        ? "Template updated on WhatsApp."
        : "Template updated and sent back to Meta for review.";

    return {
      template: {
        ...updated,
        name: existing.name,
        language: existing.language,
        category: updated.category ?? existing.category,
      },
      message,
    };
  }

  async remove(user: JwtPayload, query: DeleteMessageTemplateQueryDto) {
    await this.entitlements.assertPlanAtLeast(user.organizationId, "growth");
    const account = await this.resolveActiveAccount(user.organizationId);
    const name = sanitizeTemplateName(query.name);

    const existing = await this.findTemplateOnAccount(
      account.wabaId,
      account.accessTokenEnc,
      name,
      query.language,
    );
    if (!existing) {
      throw new BadRequestException("Template not found on your WhatsApp number.");
    }
    if (!canDeleteTemplate(existing.status)) {
      throw new BadRequestException("This template is already scheduled for deletion.");
    }

    await this.messaging.deleteMessageTemplate(account.wabaId, account.accessTokenEnc, {
      name,
      metaTemplateId: query.metaTemplateId ?? existing.metaTemplateId,
    });

    void this.templateSync.syncAccountTemplates(account.id);

    return {
      ok: true,
      message:
        existing.status === "APPROVED"
          ? "Template deleted. You cannot reuse this name for 30 days on WhatsApp."
          : "Template deleted from WhatsApp.",
    };
  }

  private async findTemplateOnAccount(
    wabaId: string,
    accessTokenEnc: string,
    name: string,
    language: string,
  ) {
    const templates = await this.messaging.listMessageTemplates(wabaId, accessTokenEnc, {
      approvedOnly: false,
    });
    return templates.find((t) => t.name === name && t.language === language);
  }

  private async resolveActiveAccount(organizationId: string) {
    const account = await this.prisma.whatsappAccount.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, wabaId: true, accessTokenEnc: true },
    });
    if (!account?.accessTokenEnc) {
      throw new BadRequestException(
        "Connect an active WhatsApp number before managing templates.",
      );
    }
    return account;
  }
}
