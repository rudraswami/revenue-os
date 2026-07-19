import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GROWVISI_WEB_URL } from "@growvisi/shared";
import { EmailService } from "../auth/email.service";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeWorkspaceOpsSettings } from "../organizations/workspace-settings";
import { WhatsappMessagingService } from "../whatsapp/whatsapp-messaging.service";

/** Minimum gap between post-close owner nudges for the same conversation. */
export const POST_CLOSE_ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000;

@Injectable()
export class PostCloseAlertService {
  private readonly logger = new Logger(PostCloseAlertService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly whatsapp: WhatsappMessagingService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Notify workspace owners when a customer messages on a Won/Lost thread.
   * Uses digest delivery channel (email / WhatsApp / both). Debounced per conversation.
   */
  async maybeNotify(opts: {
    organizationId: string;
    conversationId: string;
  }): Promise<void> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: opts.conversationId, organizationId: opts.organizationId },
      include: {
        lead: { select: { stage: true } },
      },
    });
    if (!conversation || conversation.unreadCount <= 0) return;

    const stage = conversation.lead?.stage;
    if (stage !== "WON" && stage !== "LOST") return;

    const meta =
      conversation.metadata && typeof conversation.metadata === "object"
        ? (conversation.metadata as Record<string, unknown>)
        : {};

    if (this.isWithinCooldown(meta.lastPostCloseAlertAt)) return;

    const org = await this.prisma.organization.findUnique({
      where: { id: opts.organizationId },
      select: { name: true, settings: true },
    });
    if (!org) return;

    const ops = normalizeWorkspaceOpsSettings(
      (org.settings as Record<string, unknown> | null)?.ops,
    );
    const channel = ops.digest.channel;
    const hi = ops.digest.digestLocale === "hi";
    const organizationName = org.name ?? "your workspace";
    const leadLabel =
      conversation.contactName?.trim() || conversation.contactPhone || "Customer";
    const stageLabel = stage === "WON" ? (hi ? "जीता" : "Won") : hi ? "हारा" : "Lost";
    const appUrl = (
      this.config.get<string>("NEXT_PUBLIC_APP_URL") ?? GROWVISI_WEB_URL
    ).replace(/\/$/, "");
    const inboxUrl = `${appUrl}/dashboard/inbox?c=${opts.conversationId}`;

    let delivered = false;

    if (channel === "email" || channel === "both") {
      const recipients = await this.ownerEmails(opts.organizationId);
      if (recipients.length > 0) {
        try {
          await this.email.sendPostCloseAlert({
            to: recipients,
            organizationName,
            leadLabel,
            stage: stageLabel,
            inboxUrl,
          });
          delivered = true;
        } catch (err) {
          this.logger.warn(
            `Post-close email alert failed for ${opts.conversationId}: ${err}`,
          );
        }
      }
    }

    if (channel === "whatsapp" || channel === "both") {
      const toPhone = ops.digest.whatsappPhone?.trim();
      if (toPhone) {
        const account = await this.prisma.whatsappAccount.findFirst({
          where: { organizationId: opts.organizationId, isActive: true },
          select: { phoneNumberId: true, accessTokenEnc: true, isActive: true },
        });
        if (account) {
          const body = hi
            ? `Growvisi — ${organizationName}\n${leadLabel} (${stageLabel}) ने फिर से मैसेज किया।\nइनबॉक्स: ${inboxUrl}`
            : `Growvisi — ${organizationName}\n${leadLabel} (${stageLabel}) messaged again — unread in Inbox.\nOpen: ${inboxUrl}`;
          try {
            await this.whatsapp.sendText(account, toPhone, body.slice(0, 4096));
            delivered = true;
          } catch (err) {
            this.logger.warn(
              `Post-close WhatsApp alert failed for ${opts.conversationId}: ${err}`,
            );
          }
        }
      }
    }

    if (delivered) {
      await this.prisma.conversation.update({
        where: { id: opts.conversationId },
        data: {
          metadata: {
            ...meta,
            lastPostCloseAlertAt: new Date().toISOString(),
          } as object,
        },
      });
    }
  }

  isWithinCooldown(lastPostCloseAlertAt: unknown): boolean {
    if (typeof lastPostCloseAlertAt !== "string" || !lastPostCloseAlertAt.trim()) {
      return false;
    }
    const ts = Date.parse(lastPostCloseAlertAt);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < POST_CLOSE_ALERT_COOLDOWN_MS;
  }

  private async ownerEmails(organizationId: string): Promise<string[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId, role: { in: ["OWNER", "ADMIN"] } },
      include: { user: { select: { email: true } } },
    });
    return [...new Set(members.map((m) => m.user.email).filter(Boolean))];
  }
}
