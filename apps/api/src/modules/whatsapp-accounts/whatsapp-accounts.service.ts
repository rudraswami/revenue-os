import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JwtPayload } from "@growvisi/shared";
import { GROWVISI_API_URL, GROWVISI_WEB_URL } from "@growvisi/shared";
import { decryptSecret, encryptSecret } from "../../common/crypto/token-cipher";
import { sanitizeEnvValue } from "../../config/cors-origins";
import { EmailService } from "../auth/email.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { PrismaService } from "../prisma/prisma.service";
import type { WhatsappWebhookPayload } from "../whatsapp/whatsapp.service";
import { ConnectWhatsappDto, CreateWhatsappAccountDto, UpdateWhatsappAccountDto } from "./dto/whatsapp-account.dto";

export interface WhatsappAccountSafe {
  id: string;
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  isActive: boolean;
  hasAccessToken: boolean;
  createdAt: Date;
  updatedAt: Date;
  conversationCount?: number;
}

export interface DiscoveredPhone {
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  businessName: string | null;
}

interface MetaPhoneDetails {
  id?: string;
  display_phone_number?: string;
  verified_name?: string;
  whatsapp_business_account?: { id: string; name?: string };
  error?: { message?: string };
}

interface MetaGraphList<T> {
  data?: T[];
  error?: { message?: string };
}

@Injectable()
export class WhatsappAccountsService {
  private readonly logger = new Logger(WhatsappAccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /** Developer / IT only — not shown in main product UI */
  getTechnicalSetup() {
    const apiBase =
      sanitizeEnvValue(this.config.get<string>("WEBHOOK_PUBLIC_URL")) ??
      sanitizeEnvValue(this.config.get<string>("API_URL")) ??
      (process.env.NODE_ENV === "production" ? GROWVISI_API_URL : "http://localhost:4000");
    const base = apiBase.replace(/\/$/, "");
    return {
      webhookUrl: `${base}/api/v1/webhooks/whatsapp`,
      verifyToken: sanitizeEnvValue(this.config.get<string>("WHATSAPP_VERIFY_TOKEN")) ?? "",
    };
  }

  async list(user: JwtPayload): Promise<WhatsappAccountSafe[]> {
    const rows = await this.prisma.whatsappAccount.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { conversations: true } } },
    });
    return rows.map((r) => this.toSafe(r, r._count.conversations));
  }

  async discoverPhones(accessToken: string): Promise<DiscoveredPhone[]> {
    const token = accessToken.trim();
    const version = this.apiVersion();
    const found: DiscoveredPhone[] = [];

    const wabaIds = await this.resolveWabaIdsFromToken(token);
    for (const wabaId of wabaIds) {
      found.push(...(await this.listPhonesForWaba(wabaId, token, version)));
    }

    if (found.length > 0) {
      return found;
    }

    const meUrl = `https://graph.facebook.com/${version}/me?fields=whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}`;
    const meRes = await fetch(meUrl, { headers: { Authorization: `Bearer ${token}` } });
    const meBody = (await meRes.json()) as {
      whatsapp_business_accounts?: MetaGraphList<{
        id: string;
        name?: string;
        phone_numbers?: MetaGraphList<{
          id: string;
          display_phone_number?: string;
          verified_name?: string;
        }>;
      }>;
      error?: { message?: string };
    };

    if (meRes.ok && meBody.whatsapp_business_accounts?.data) {
      for (const waba of meBody.whatsapp_business_accounts.data) {
        for (const phone of waba.phone_numbers?.data ?? []) {
          if (!phone.id || !phone.display_phone_number) continue;
          found.push({
            phoneNumberId: phone.id,
            wabaId: waba.id,
            displayPhoneNumber: phone.display_phone_number,
            verifiedName: phone.verified_name ?? null,
            businessName: waba.name ?? null,
          });
        }
      }
    }

    if (found.length > 0) {
      return found;
    }

    const bizUrl = `https://graph.facebook.com/${version}/me/businesses?fields=id,name`;
    const bizRes = await fetch(bizUrl, { headers: { Authorization: `Bearer ${token}` } });
    const bizBody = (await bizRes.json()) as MetaGraphList<{ id: string; name?: string }>;

    if (bizRes.ok && bizBody.data?.length) {
      for (const biz of bizBody.data) {
        const wabaUrl = `https://graph.facebook.com/${version}/${biz.id}/owned_whatsapp_business_accounts?fields=id,name,phone_numbers{id,display_phone_number,verified_name}`;
        const wabaRes = await fetch(wabaUrl, { headers: { Authorization: `Bearer ${token}` } });
        const wabaBody = (await wabaRes.json()) as MetaGraphList<{
          id: string;
          name?: string;
          phone_numbers?: MetaGraphList<{
            id: string;
            display_phone_number?: string;
            verified_name?: string;
          }>;
        }>;

        for (const waba of wabaBody.data ?? []) {
          for (const phone of waba.phone_numbers?.data ?? []) {
            if (!phone.id || !phone.display_phone_number) continue;
            found.push({
              phoneNumberId: phone.id,
              wabaId: waba.id,
              displayPhoneNumber: phone.display_phone_number,
              verifiedName: phone.verified_name ?? null,
              businessName: waba.name ?? biz.name ?? null,
            });
          }
        }
      }
    }

    if (found.length === 0) {
      const hint =
        meBody.error?.message ??
        bizBody.error?.message ??
        "No WhatsApp numbers found. Check that your token has WhatsApp permissions.";
      throw new BadRequestException(hint);
    }

    return found;
  }

  async connect(user: JwtPayload, dto: ConnectWhatsappDto) {
    const phoneNumberId = dto.phoneNumberId.trim();
    const accessToken = dto.accessToken.trim();

    const duplicate = await this.prisma.whatsappAccount.findFirst({
      where: { organizationId: user.organizationId, phoneNumberId },
    });
    if (duplicate) {
      return this.refreshAccessToken(user, duplicate.id, accessToken);
    }

    const details = await this.fetchPhoneDetails(phoneNumberId, accessToken);
    const wabaId =
      dto.wabaId?.trim() ||
      (await this.resolveWabaForPhone(phoneNumberId, accessToken));
    if (!wabaId) {
      throw new BadRequestException(
        "Could not determine WhatsApp Business Account ID. Copy WhatsApp Business Account ID from Meta API Setup and paste it in the WABA ID field.",
      );
    }

    await this.subscribeWabaWebhooks(wabaId, accessToken);

    return this.create(user, {
      phoneNumberId,
      wabaId,
      displayPhoneNumber: details.display_phone_number ?? phoneNumberId,
      verifiedName: details.verified_name,
      accessToken,
    });
  }

  async create(user: JwtPayload, dto: CreateWhatsappAccountDto) {
    await this.entitlements.assertCanAddWhatsappNumber(user.organizationId);

    const accessToken = dto.accessToken.trim();
    const phoneNumberId = dto.phoneNumberId.trim();

    const details = await this.fetchPhoneDetails(phoneNumberId, accessToken);
    const wabaId = dto.wabaId?.trim() || (await this.resolveWabaForPhone(phoneNumberId, accessToken));
    if (!wabaId) {
      throw new BadRequestException("Missing WhatsApp business account ID.");
    }

    const tokenDebug = await this.debugInputToken(accessToken);
    const metadata: Record<string, unknown> = {};
    if (tokenDebug.metaFacebookUserId) {
      metadata.metaFacebookUserId = tokenDebug.metaFacebookUserId;
    }

    const account = await this.prisma.whatsappAccount.create({
      data: {
        organizationId: user.organizationId,
        phoneNumberId,
        wabaId,
        displayPhoneNumber:
          dto.displayPhoneNumber?.trim() || details.display_phone_number?.trim() || phoneNumberId,
        verifiedName: dto.verifiedName?.trim() ?? details.verified_name ?? null,
        accessTokenEnc: encryptSecret(accessToken),
        metadata: metadata as object,
      },
    });

    return this.toSafe(account);
  }

  async update(user: JwtPayload, id: string, dto: UpdateWhatsappAccountDto) {
    const existing = await this.findOwned(user, id);
    const data: Record<string, unknown> = {};

    if (dto.displayPhoneNumber !== undefined) {
      data.displayPhoneNumber = dto.displayPhoneNumber.trim();
    }
    if (dto.verifiedName !== undefined) {
      data.verifiedName = dto.verifiedName.trim() || null;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.accessToken) {
      await this.fetchPhoneDetails(existing.phoneNumberId, dto.accessToken);
      data.accessTokenEnc = encryptSecret(dto.accessToken.trim());
      data.metadata = {
        ...((existing.metadata ?? {}) as Record<string, unknown>),
        tokenReminderSentAt: null,
        tokenUpdatedAt: new Date().toISOString(),
      };
    }

    const updated = await this.prisma.whatsappAccount.update({
      where: { id },
      data,
    });
    return this.toSafe(updated);
  }

  async remove(user: JwtPayload, id: string) {
    await this.findOwned(user, id);
    await this.prisma.whatsappAccount.delete({ where: { id } });
    return { deleted: true };
  }

  async verifyConnection(user: JwtPayload, id: string) {
    const account = await this.findOwned(user, id);
    const token = decryptSecret(account.accessTokenEnc);
    await this.fetchPhoneDetails(account.phoneNumberId, token);
    return {
      ok: true,
      message: "Your WhatsApp number is connected.",
    };
  }

  /** Debug why inbound messages may not appear in Conversations. */
  async getConnectionHealth(user: JwtPayload) {
    const technical = this.getTechnicalSetup();
    const accounts = await this.prisma.whatsappAccount.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
    });

    const [conversationCount, inboundCount, recentWebhooks] = await Promise.all([
      this.prisma.conversation.count({ where: { organizationId: user.organizationId } }),
      this.prisma.message.count({
        where: { organizationId: user.organizationId, direction: "INBOUND" },
      }),
      this.prisma.webhookEvent.findMany({
        where: {
          source: "whatsapp",
          createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          processedAt: true,
          error: true,
          createdAt: true,
          payload: true,
        },
      }),
    ]);

    const phoneIds = new Set(accounts.map((a) => a.phoneNumberId));
    const wabaIds = new Set(accounts.map((a) => a.wabaId));

    const webhookSummary = recentWebhooks.map((w) => {
      const payload = w.payload as unknown as WhatsappWebhookPayload;
      const phoneNumberId =
        payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ?? null;
      const wabaId = payload.entry?.[0]?.id ?? null;
      const messageCount =
        payload.entry?.[0]?.changes?.[0]?.value?.messages?.length ?? 0;
      const matchesOrg =
        (phoneNumberId && phoneIds.has(phoneNumberId)) ||
        (wabaId && wabaIds.has(wabaId));

      return {
        id: w.id,
        at: w.createdAt,
        processed: !!w.processedAt,
        error: w.error,
        phoneNumberId,
        wabaId,
        inboundInPayload: messageCount,
        matchesYourAccount: matchesOrg,
      };
    });

    const webhooksForYou = webhookSummary.filter((w) => w.matchesYourAccount);
    const secretConfigured = !!(
      this.config.get<string>("WHATSAPP_APP_SECRET")?.trim() ||
      this.config.get<string>("META_APP_SECRET")?.trim()
    );

    const checks = [
      {
        id: "account",
        ok: accounts.some((a) => a.isActive),
        detail: accounts.some((a) => a.isActive)
          ? `Active number: ${accounts.find((a) => a.isActive)?.displayPhoneNumber}`
          : "No WhatsApp number connected yet",
      },
      {
        id: "webhook_url",
        ok: technical.webhookUrl.includes("growvisi.in"),
        detail: technical.webhookUrl.includes("growvisi.in")
          ? "Growvisi is ready to receive customer messages"
          : "Message routing needs configuration",
      },
      {
        id: "verify_token",
        ok: !!technical.verifyToken,
        detail: technical.verifyToken
          ? "Webhook verification configured"
          : "Webhook verification incomplete",
      },
      {
        id: "app_secret",
        ok: secretConfigured,
        detail: secretConfigured
          ? "Inbound message security enabled"
          : "Message security verification incomplete",
      },
      {
        id: "messages_ingested",
        ok: inboundCount > 0,
        detail:
          inboundCount > 0
            ? `${inboundCount} customer message${inboundCount === 1 ? "" : "s"} received`
            : "No customer messages received yet",
      },
      {
        id: "meta_webhooks",
        ok: webhooksForYou.some((w) => w.processed && w.inboundInPayload > 0),
        detail:
          webhooksForYou.length === 0
            ? "Waiting for first customer message from Meta"
            : `${webhooksForYou.length} live event${webhooksForYou.length === 1 ? "" : "s"} received (48h)`,
      },
    ];

    return {
      checks,
      accounts: accounts.map((a) => ({
        id: a.id,
        phoneNumberId: a.phoneNumberId,
        wabaId: a.wabaId,
        displayPhoneNumber: a.displayPhoneNumber,
        isActive: a.isActive,
      })),
      stats: { conversationCount, inboundCount },
      tokenHealth: await this.tokenHealthForOrg(accounts),
      recentWebhooks: webhookSummary.slice(0, 8),
      metaSetup: {
        webhookUrl: technical.webhookUrl,
        verifyTokenHint: technical.verifyToken
          ? `${technical.verifyToken.slice(0, 4)}…`
          : "",
        testTip:
          "Meta's \"Send test message\" in API Setup sends from your business to your phone — it won't appear in Conversations. Message your business number from your personal phone instead.",
      },
    };
  }

  async verifyCredentials(phoneNumberId: string, accessToken: string) {
    const meta = await this.fetchPhoneDetails(phoneNumberId.trim(), accessToken.trim());
    return {
      ok: true,
      displayPhoneNumber: meta.display_phone_number,
      verifiedName: meta.verified_name,
    };
  }

  /** Growvisi server readiness before customer opens Meta API Setup. */
  getOnboardingReadiness() {
    const technical = this.getTechnicalSetup();
    const appId = this.config.get<string>("META_APP_ID")?.trim() ?? "";
    const secretConfigured = !!this.appSecret();
    const isProd = process.env.NODE_ENV === "production";

    const checks = [
      {
        id: "webhook_url",
        ok: isProd ? technical.webhookUrl.includes("growvisi.in") : !!technical.webhookUrl,
        detail: `Webhook: ${technical.webhookUrl}`,
      },
      {
        id: "verify_token",
        ok: !!technical.verifyToken,
        detail: technical.verifyToken
          ? "Webhook verify token configured"
          : "WHATSAPP_VERIFY_TOKEN missing on API",
      },
      {
        id: "app_secret",
        ok: secretConfigured,
        detail: secretConfigured
          ? "Meta app secret configured for signed webhooks"
          : "META_APP_SECRET missing — inbound webhooks will fail",
      },
    ];

    return {
      ready: checks.every((c) => c.ok),
      checks,
      metaApiSetupUrl: appId
        ? `https://developers.facebook.com/apps/${appId}/whatsapp-business/wa-dev-console/`
        : "https://developers.facebook.com/apps/",
      appId: appId || null,
    };
  }

  /**
   * Discover → verify → subscribe → save in one call.
   * If phoneNumberId is omitted and exactly one number exists on the token, it is selected automatically.
   */
  async quickConnect(user: JwtPayload, dto: { accessToken: string; phoneNumberId?: string; wabaId?: string }) {
    const accessToken = dto.accessToken.trim();
    const phones = await this.discoverPhones(accessToken);

    let phoneNumberId = dto.phoneNumberId?.trim();
    let wabaId = dto.wabaId?.trim();

    if (!phoneNumberId) {
      if (phones.length === 1) {
        phoneNumberId = phones[0].phoneNumberId;
        wabaId = wabaId || phones[0].wabaId;
      } else {
        throw new BadRequestException(
          phones.length === 0
            ? "No WhatsApp numbers on this token."
            : "Multiple numbers found — select which business line to connect.",
        );
      }
    } else {
      const match = phones.find((p) => p.phoneNumberId === phoneNumberId);
      if (match) {
        wabaId = wabaId || match.wabaId;
      }
    }

    const existing = await this.prisma.whatsappAccount.findFirst({
      where: { organizationId: user.organizationId, phoneNumberId },
    });
    if (existing) {
      const refreshed = await this.refreshAccessToken(user, existing.id, accessToken);
      return {
        account: refreshed.account,
        discovered: phones,
        autoSelected: !dto.phoneNumberId?.trim() && phones.length === 1,
      };
    }

    const account = await this.connect(user, {
      accessToken,
      phoneNumberId,
      wabaId,
    });

    return {
      account,
      discovered: phones,
      autoSelected: !dto.phoneNumberId?.trim() && phones.length === 1,
    };
  }

  /** Replace expired Meta temporary token without disconnecting the number. */
  async refreshAccessToken(user: JwtPayload, id: string, accessToken: string) {
    const account = await this.findOwned(user, id);
    const token = accessToken.trim();
    await this.fetchPhoneDetails(account.phoneNumberId, token);
    await this.subscribeWabaWebhooks(account.wabaId, token);

    const updated = await this.prisma.whatsappAccount.update({
      where: { id },
      data: {
        accessTokenEnc: encryptSecret(token),
        metadata: {
          ...((account.metadata ?? {}) as Record<string, unknown>),
          tokenReminderSentAt: null,
          tokenUpdatedAt: new Date().toISOString(),
        },
      },
    });

    return {
      account: this.toSafe(updated),
      tokenHealth: await this.debugInputToken(token),
    };
  }

  private async tokenHealthForOrg(
    accounts: Array<{ isActive: boolean; accessTokenEnc: string }>,
  ) {
    const active = accounts.find((a) => a.isActive);
    if (!active) {
      return {
        valid: false,
        expiresAt: null as string | null,
        hoursRemaining: null as number | null,
        level: "ok" as const,
        needsRefresh: false,
        needsAttention: false,
        hint: "Connect a WhatsApp number first.",
      };
    }

    try {
      const token = decryptSecret(active.accessTokenEnc);
      const health = await this.debugInputToken(token);
      return {
        ...health,
        needsAttention: !health.valid || health.needsRefresh,
        hint:
          health.level === "urgent"
            ? "Generate a new token in Meta API Setup and paste it in Settings under Refresh access token."
            : health.level === "soon"
              ? "Your Meta token expires in about a day — refresh soon to avoid missing customer messages."
              : "Access token is active.",
      };
    } catch {
      return {
        valid: false,
        expiresAt: null,
        hoursRemaining: null,
        needsRefresh: true,
        hint: "Could not verify your token — paste a fresh one from Meta API Setup.",
      };
    }
  }

  private async debugInputToken(accessToken: string) {
    const appId = this.config.get<string>("META_APP_ID")?.trim();
    const appSecret = this.appSecret();
    if (!appId || !appSecret) {
      return {
        valid: true,
        expiresAt: null as string | null,
        hoursRemaining: null as number | null,
        level: "ok" as const,
        needsRefresh: false,
      };
    }

    const version = this.apiVersion();
    const url = new URL(`https://graph.facebook.com/${version}/debug_token`);
    url.searchParams.set("input_token", accessToken);
    url.searchParams.set("access_token", `${appId}|${appSecret}`);

    const res = await fetch(url);
    const body = (await res.json()) as {
      data?: { is_valid?: boolean; expires_at?: number; type?: string; user_id?: string };
    };

    if (!res.ok || !body.data) {
      return {
        valid: false,
        expiresAt: null as string | null,
        hoursRemaining: null as number | null,
        level: "urgent" as const,
        needsRefresh: true,
      };
    }

    const expiresAtUnix = body.data.expires_at ?? 0;
    // expires_at 0 = non-expiring (system user / long-lived tokens)
    const expiresAt =
      expiresAtUnix > 0 ? new Date(expiresAtUnix * 1000) : null;
    const hoursRemaining = expiresAt
      ? Math.max(0, (expiresAt.getTime() - Date.now()) / 3_600_000)
      : null;

    const valid = !!body.data.is_valid;
    const needsRefresh =
      !valid || (hoursRemaining !== null && hoursRemaining < 4);

    return {
      valid,
      expiresAt: expiresAt?.toISOString() ?? null,
      hoursRemaining:
        hoursRemaining !== null ? Math.round(hoursRemaining * 10) / 10 : null,
      metaFacebookUserId: body.data.user_id ? String(body.data.user_id) : null,
      level: this.tokenHealthLevel(valid, hoursRemaining),
      needsRefresh,
    };
  }

  private tokenHealthLevel(
    valid: boolean,
    hoursRemaining: number | null,
  ): "ok" | "soon" | "urgent" {
    if (!valid) return "urgent";
    if (hoursRemaining === null) return "ok";
    if (hoursRemaining < 4) return "urgent";
    if (hoursRemaining < 12) return "soon";
    return "ok";
  }

  /** Cron job: email workspace owners when Meta temporary tokens need refresh. */
  async runTokenReminderJob() {
    const accounts = await this.prisma.whatsappAccount.findMany({
      where: { isActive: true },
      include: {
        organization: {
          include: {
            members: {
              where: { role: { in: ["OWNER", "ADMIN"] } },
              include: { user: { select: { email: true, name: true } } },
            },
          },
        },
      },
    });

    const settingsUrl = `${GROWVISI_WEB_URL}/dashboard/settings#whatsapp`;
    let checked = 0;
    let sent = 0;
    let skipped = 0;

    for (const account of accounts) {
      checked++;
      try {
        const token = decryptSecret(account.accessTokenEnc);
        const health = await this.debugInputToken(token);
        const metadata = (account.metadata ?? {}) as Record<string, unknown>;

        const isUrgent =
          health.level === "urgent";
        const isHeadsUp =
          health.level === "soon";

        if (!isUrgent && !isHeadsUp) {
          skipped++;
          continue;
        }

        const now = Date.now();
        const twelveHours = 12 * 60 * 60 * 1000;
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (isUrgent) {
          const lastSent = metadata.tokenReminderSentAt
            ? new Date(String(metadata.tokenReminderSentAt)).getTime()
            : 0;
          if (lastSent && now - lastSent < twelveHours) {
            skipped++;
            continue;
          }
        } else {
          const lastHeadsUp = metadata.tokenHeadsUpSentAt
            ? new Date(String(metadata.tokenHeadsUpSentAt)).getTime()
            : 0;
          if (lastHeadsUp && now - lastHeadsUp < twentyFourHours) {
            skipped++;
            continue;
          }
        }

        const recipients = [
          ...new Set(
            account.organization.members.map((m) => m.user.email).filter(Boolean),
          ),
        ];
        if (recipients.length === 0) {
          skipped++;
          continue;
        }

        if (isUrgent) {
          const expiryText = !health.valid
            ? "Your Meta access token is no longer valid"
            : health.hoursRemaining != null
              ? `Your Meta access token expires in about ${Math.ceil(health.hoursRemaining)} hours`
              : "Your Meta access token may expire soon";

          await this.email.sendWhatsappTokenReminder({
            to: recipients,
            organizationName: account.organization.name,
            displayPhoneNumber: account.displayPhoneNumber,
            expiryText,
            settingsUrl,
          });

          await this.prisma.whatsappAccount.update({
            where: { id: account.id },
            data: {
              metadata: {
                ...metadata,
                tokenReminderSentAt: new Date().toISOString(),
              },
            },
          });
        } else {
          await this.email.sendWhatsappTokenHeadsUp({
            to: recipients,
            organizationName: account.organization.name,
            displayPhoneNumber: account.displayPhoneNumber,
            hoursRemaining: health.hoursRemaining ?? 20,
            settingsUrl,
          });

          await this.prisma.whatsappAccount.update({
            where: { id: account.id },
            data: {
              metadata: {
                ...metadata,
                tokenHeadsUpSentAt: new Date().toISOString(),
              },
            },
          });
        }

        sent++;
      } catch (err) {
        this.logger.warn(
          `Token reminder skipped for account ${account.id}: ${err instanceof Error ? err.message : err}`,
        );
        skipped++;
      }
    }

    return { checked, sent, skipped };
  }

  private async findOwned(user: JwtPayload, id: string) {
    const account = await this.prisma.whatsappAccount.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!account) {
      throw new NotFoundException("WhatsApp account not found");
    }
    return account;
  }

  private toSafe(
    row: {
      id: string;
      phoneNumberId: string;
      wabaId: string;
      displayPhoneNumber: string;
      verifiedName: string | null;
      isActive: boolean;
      accessTokenEnc: string;
      createdAt: Date;
      updatedAt: Date;
    },
    conversationCount?: number,
  ): WhatsappAccountSafe {
    return {
      id: row.id,
      phoneNumberId: row.phoneNumberId,
      wabaId: row.wabaId,
      displayPhoneNumber: row.displayPhoneNumber,
      verifiedName: row.verifiedName,
      isActive: row.isActive,
      hasAccessToken: !!row.accessTokenEnc,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      conversationCount,
    };
  }

  private apiVersion() {
    return this.config.get<string>("WHATSAPP_API_VERSION") ?? "v21.0";
  }

  private async fetchPhoneDetails(phoneNumberId: string, accessToken: string) {
    const version = this.apiVersion();
    const url = `https://graph.facebook.com/${version}/${phoneNumberId}?fields=display_phone_number,verified_name`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await res.json()) as MetaPhoneDetails;
    if (!res.ok) {
      throw new BadRequestException(body.error?.message ?? `Meta API error ${res.status}`);
    }
    return body;
  }

  private appSecret() {
    return (
      this.config.get<string>("META_APP_SECRET")?.trim() ||
      this.config.get<string>("WHATSAPP_APP_SECRET")?.trim() ||
      ""
    );
  }

  private async resolveWabaIdsFromToken(accessToken: string): Promise<string[]> {
    const appId = this.config.get<string>("META_APP_ID")?.trim();
    const appSecret = this.appSecret();
    if (!appId || !appSecret) return [];

    const version = this.apiVersion();
    const appToken = `${appId}|${appSecret}`;
    const url = new URL(`https://graph.facebook.com/${version}/debug_token`);
    url.searchParams.set("input_token", accessToken);
    url.searchParams.set("access_token", appToken);

    const res = await fetch(url);
    const body = (await res.json()) as {
      data?: {
        granular_scopes?: Array<{ scope?: string; target_ids?: string[] }>;
      };
    };

    if (!res.ok) return [];

    const ids = new Set<string>();
    for (const scope of body.data?.granular_scopes ?? []) {
      if (!scope.scope?.includes("whatsapp")) continue;
      for (const id of scope.target_ids ?? []) {
        if (id) ids.add(id);
      }
    }
    return [...ids];
  }

  private async resolveWabaForPhone(
    phoneNumberId: string,
    accessToken: string,
  ): Promise<string | undefined> {
    const version = this.apiVersion();
    for (const wabaId of await this.resolveWabaIdsFromToken(accessToken)) {
      const phones = await this.listPhonesForWaba(wabaId, accessToken, version);
      if (phones.some((p) => p.phoneNumberId === phoneNumberId)) {
        return wabaId;
      }
    }
    return undefined;
  }

  private async listPhonesForWaba(
    wabaId: string,
    accessToken: string,
    version: string,
  ): Promise<DiscoveredPhone[]> {
    const url = `https://graph.facebook.com/${version}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const body = (await res.json()) as MetaGraphList<{
      id: string;
      display_phone_number?: string;
      verified_name?: string;
    }>;

    if (!res.ok) return [];

    return (body.data ?? [])
      .filter((phone) => phone.id && phone.display_phone_number)
      .map((phone) => ({
        phoneNumberId: phone.id,
        wabaId,
        displayPhoneNumber: phone.display_phone_number!,
        verifiedName: phone.verified_name ?? null,
        businessName: null,
      }));
  }

  private async subscribeWabaWebhooks(wabaId: string, accessToken: string) {
    const version = this.apiVersion();
    const res = await fetch(`https://graph.facebook.com/${version}/${wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await res.json()) as { success?: boolean; error?: { message?: string } };
    if (!res.ok && !body.success) {
      throw new BadRequestException(
        body.error?.message ?? "Could not enable WhatsApp webhooks for this account.",
      );
    }
  }
}
