import { Injectable, Logger } from "@nestjs/common";
import {
  AUTO_PROVISION_STARTER_ID,
  defaultTemplateNameFromStarter,
  resolveAutoProvisionStarterId,
  starterById,
} from "@growvisi/shared";
import { EntitlementsService } from "../billing/entitlements.service";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { WhatsappMessagingService } from "./whatsapp-messaging.service";

export type TemplateStatusWebhookEvent = {
  event: string;
  messageTemplateId?: string | number;
  messageTemplateName?: string;
  messageTemplateLanguage?: string;
  messageTemplateCategory?: string;
  reason?: string | null;
  rejectionInfo?: { reason?: string; recommendation?: string };
};

@Injectable()
export class WhatsappTemplateSyncService {
  private readonly logger = new Logger(WhatsappTemplateSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: WhatsappMessagingService,
    private readonly entitlements: EntitlementsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /** Pull Meta message templates into account metadata. */
  async syncAccountTemplates(accountId: string) {
    const account = await this.prisma.whatsappAccount.findUnique({
      where: { id: accountId },
      select: { id: true, wabaId: true, accessTokenEnc: true, metadata: true },
    });
    if (!account?.accessTokenEnc) return null;

    try {
      const templates = await this.messaging.listMessageTemplates(
        account.wabaId,
        account.accessTokenEnc,
        { approvedOnly: false },
      );
      const approvedTemplateCount = templates.filter((t) => t.status === "APPROVED").length;
      const pendingTemplateCount = templates.filter(
        (t) => t.status === "PENDING" || t.status === "IN_APPEAL",
      ).length;
      const metadata = {
        ...((account.metadata ?? {}) as Record<string, unknown>),
        templatesSyncedAt: new Date().toISOString(),
        templateCount: templates.length,
        approvedTemplateCount,
        pendingTemplateCount,
      };

      await this.prisma.whatsappAccount.update({
        where: { id: account.id },
        data: { metadata: metadata as object },
      });

      return { templateCount: templates.length, approvedTemplateCount, pendingTemplateCount };
    } catch (err) {
      this.logger.warn(
        `Template sync failed for account ${accountId}: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  /** Meta message_template_status_update — refresh cached counts after approval/rejection. */
  async handleTemplateStatusUpdate(wabaId: string, update: TemplateStatusWebhookEvent) {
    const accounts = await this.prisma.whatsappAccount.findMany({
      where: { wabaId, isActive: true },
      select: { id: true, organizationId: true, metadata: true },
    });

    if (accounts.length === 0) {
      this.logger.warn(
        `message_template_status_update ${update.event} for WABA ${wabaId} — no active account`,
      );
      return;
    }

    for (const account of accounts) {
      const metadata = {
        ...((account.metadata ?? {}) as Record<string, unknown>),
        lastTemplateStatusUpdate: {
          ...update,
          at: new Date().toISOString(),
        },
      };

      await this.prisma.whatsappAccount.update({
        where: { id: account.id },
        data: { metadata: metadata as object },
      });

      await this.syncAccountTemplates(account.id);

      this.realtime.emitTemplatesUpdated(account.organizationId, {
        event: update.event,
        templateName: update.messageTemplateName,
        language: update.messageTemplateLanguage,
      });

      this.logger.log(
        `Template ${update.messageTemplateName ?? update.messageTemplateId} → ${update.event} for org=${account.organizationId}`,
      );
    }
  }

  /**
   * On first connect, submit one UTILITY starter when the WABA has zero templates.
   * Growth+ only; non-blocking; never retries after first attempt.
   */
  async provisionDefaultStarterIfNeeded(accountId: string, organizationId: string) {
    const account = await this.prisma.whatsappAccount.findUnique({
      where: { id: accountId },
      select: { id: true, wabaId: true, accessTokenEnc: true, metadata: true },
    });
    if (!account?.accessTokenEnc) return;

    const metadata = (account.metadata ?? {}) as Record<string, unknown>;
    if (metadata.starterTemplatesProvisioned) return;

    try {
      await this.entitlements.assertPlanAtLeast(organizationId, "growth");
    } catch {
      return;
    }

    const sync = await this.syncAccountTemplates(accountId);
    if (!sync || sync.templateCount > 0) {
      await this.markProvisionAttempted(accountId, metadata, "skipped_has_templates");
      return;
    }

    const ownerLocale = await this.resolveOwnerLocale(organizationId);
    const starterId = resolveAutoProvisionStarterId(ownerLocale);
    const starter = starterById(starterId);
    if (!starter) {
      await this.markProvisionAttempted(accountId, metadata, "skipped_no_starter");
      return;
    }

    const name = defaultTemplateNameFromStarter(starter.id);

    try {
      await this.messaging.createMessageTemplate(account.wabaId, account.accessTokenEnc, {
        name,
        language: starter.language,
        category: starter.category,
        body: starter.body,
      });
      await this.markProvisionAttempted(accountId, metadata, "submitted", name);
      await this.syncAccountTemplates(accountId);
      this.logger.log(
        `Auto-provisioned starter template ${name} for org=${organizationId} account=${accountId}`,
      );
    } catch (err) {
      this.logger.warn(
        `Auto-provision starter failed for account ${accountId}: ${err instanceof Error ? err.message : err}`,
      );
      await this.markProvisionAttempted(accountId, metadata, "failed");
    }
  }

  private async resolveOwnerLocale(organizationId: string): Promise<string | null> {
    const owner = await this.prisma.organizationMember.findFirst({
      where: { organizationId, role: "OWNER" },
      select: { user: { select: { locale: true } } },
      orderBy: { joinedAt: "asc" },
    });
    return owner?.user.locale ?? null;
  }

  private async markProvisionAttempted(
    accountId: string,
    metadata: Record<string, unknown>,
    outcome: string,
    templateName?: string,
  ) {
    await this.prisma.whatsappAccount.update({
      where: { id: accountId },
      data: {
        metadata: {
          ...metadata,
          starterTemplatesProvisioned: true,
          starterTemplatesProvisionedAt: new Date().toISOString(),
          starterTemplatesProvisionOutcome: outcome,
          ...(templateName ? { starterTemplatesProvisionName: templateName } : {}),
        } as object,
      },
    });
  }
}
