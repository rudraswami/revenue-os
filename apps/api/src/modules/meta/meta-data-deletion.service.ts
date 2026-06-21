import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MetaDataDeletionService {
  private readonly logger = new Logger(MetaDataDeletionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Meta sends a Facebook user id — delete WhatsApp channel data linked to that id.
   * Falls back to logging when no linked account is found (manual privacy follow-up).
   */
  async processDeletionRequest(facebookUserId: string, confirmationCode: string) {
    const accounts = await this.prisma.whatsappAccount.findMany({
      where: {
        metadata: {
          path: ["metaFacebookUserId"],
          equals: facebookUserId,
        },
      },
      select: { id: true, organizationId: true },
    });

    if (accounts.length === 0) {
      await this.markWebhookStatus(confirmationCode, "received", {
        facebookUserId,
        status: "received",
        note: "No linked WhatsApp account found for this Meta user. Email privacy@growvisi.in to complete removal.",
      });
      return { deletedAccounts: 0, organizations: [] as string[] };
    }

    const orgIds = [...new Set(accounts.map((a) => a.organizationId))];

    for (const account of accounts) {
      await this.prisma.whatsappAccount.delete({ where: { id: account.id } });
    }

    await this.markWebhookStatus(confirmationCode, "completed", {
      facebookUserId,
      status: "completed",
      deletedAccounts: accounts.length,
      organizationIds: orgIds,
      note: "WhatsApp channel data removed for this Meta user.",
    });

    this.logger.log(
      `Meta deletion ${confirmationCode}: removed ${accounts.length} WhatsApp account(s)`,
    );

    return { deletedAccounts: accounts.length, organizations: orgIds };
  }

  private async markWebhookStatus(
    confirmationCode: string,
    status: string,
    payload: Record<string, unknown>,
  ) {
    const event = await this.prisma.webhookEvent.findFirst({
      where: { source: "meta_data_deletion", eventType: confirmationCode },
      orderBy: { createdAt: "desc" },
    });
    if (!event) return;

    const existing = (event.payload ?? {}) as Record<string, unknown>;
    await this.prisma.webhookEvent.update({
      where: { id: event.id },
      data: {
        payload: {
          ...existing,
          ...payload,
          status,
        },
      },
    });
  }
}
