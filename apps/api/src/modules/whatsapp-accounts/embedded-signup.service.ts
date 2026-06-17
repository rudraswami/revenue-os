import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JwtPayload } from "@growvisi/shared";
import { encryptSecret } from "../../common/crypto/token-cipher";
import { sanitizeEnvValue } from "../../config/cors-origins";
import { PrismaService } from "../prisma/prisma.service";
import { WhatsappAccountSafe } from "./whatsapp-accounts.service";

@Injectable()
export class EmbeddedSignupService {
  private readonly logger = new Logger(EmbeddedSignupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  getPublicConfig() {
    const appId = sanitizeEnvValue(this.config.get<string>("META_APP_ID"));
    const configId = sanitizeEnvValue(this.config.get<string>("META_EMBEDDED_SIGNUP_CONFIG_ID"));
    const graphApiVersion = this.apiVersion();
    const solutionId = sanitizeEnvValue(this.config.get<string>("META_PARTNER_SOLUTION_ID")) ?? "";
    const featureType =
      sanitizeEnvValue(this.config.get<string>("META_EMBEDDED_SIGNUP_FEATURE_TYPE")) ?? "";

    const embeddedSignupLive =
      sanitizeEnvValue(this.config.get<string>("WHATSAPP_EMBEDDED_SIGNUP_LIVE")) === "true";

    return {
      enabled: !!(appId && configId && this.appSecret()),
      embeddedSignupLive,
      appId: appId ?? "",
      configId: configId ?? "",
      graphApiVersion,
      solutionId,
      /** Omit for standard v4 WhatsApp Embedded Signup config; set only for coex / waba-only flows. */
      featureType,
    };
  }

  /** Server-side Meta checks — helps distinguish code/env issues from Meta app restrictions. */
  async diagnoseMetaApp() {
    const appId = sanitizeEnvValue(this.config.get<string>("META_APP_ID"));
    const configId = sanitizeEnvValue(this.config.get<string>("META_EMBEDDED_SIGNUP_CONFIG_ID"));
    const secret = this.appSecret();
    const version = this.apiVersion();
    const webUrl = sanitizeEnvValue(this.config.get<string>("NEXT_PUBLIC_APP_URL"));

    const result: {
      env: {
        appId: string;
        configId: string;
        graphApiVersion: string;
        secretConfigured: boolean;
        webhookUrl: string;
        webUrl: string;
      };
      graphApp: Record<string, unknown> | null;
      graphError: string | null;
      checks: Array<{ id: string; ok: boolean; detail: string }>;
    } = {
      env: {
        appId: appId ?? "",
        configId: configId ?? "",
        graphApiVersion: version,
        secretConfigured: !!secret,
        webhookUrl: sanitizeEnvValue(this.config.get<string>("WEBHOOK_PUBLIC_URL")) ?? "",
        webUrl: webUrl ?? "",
      },
      graphApp: null,
      graphError: null,
      checks: [],
    };

    const push = (id: string, ok: boolean, detail: string) => {
      result.checks.push({ id, ok, detail });
    };

    push(
      "meta_app_id",
      appId === "1694805491426991",
      appId ? `META_APP_ID=${appId}` : "META_APP_ID missing",
    );
    push(
      "meta_config_id",
      configId === "1331710591627115",
      configId ? `META_EMBEDDED_SIGNUP_CONFIG_ID=${configId}` : "CONFIG_ID missing",
    );
    push("meta_app_secret", !!secret, secret ? "META_APP_SECRET set" : "META_APP_SECRET missing on API");
    push(
      "web_url",
      !!webUrl?.includes("growvisi.in"),
      webUrl ? `NEXT_PUBLIC_APP_URL=${webUrl}` : "NEXT_PUBLIC_APP_URL missing",
    );

    if (!appId || !secret) {
      push("graph_api", false, "Skipped Graph API — need app ID + secret");
      return result;
    }

    try {
      const appToken = `${appId}|${secret}`;
      const url = `https://graph.facebook.com/${version}/${appId}?fields=name,category,app_domains,restrictions`;
      const res = await fetch(url);
      const body = (await res.json()) as Record<string, unknown> & {
        error?: { message?: string };
      };

      if (!res.ok || body.error) {
        result.graphError = body.error?.message ?? `Graph API HTTP ${res.status}`;
        push("graph_api", false, result.graphError);
      } else {
        result.graphApp = body;
        push("graph_api", true, `App "${body.name}" reachable via Graph API`);
        const domains = Array.isArray(body.app_domains) ? body.app_domains : [];
        push(
          "app_domains",
          domains.some((d) => String(d).includes("growvisi.in")),
          `App domains: ${domains.join(", ") || "(none)"}`,
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Graph request failed";
      result.graphError = msg;
      push("graph_api", false, msg);
    }

    push(
      "facebook_login_settings",
      false,
      "Manual: Facebook Login for Business → Settings → Login with JavaScript SDK = Yes; Allowed Domains = growvisi.in, www.growvisi.in; OAuth URIs = https://www.growvisi.in/",
    );
    push(
      "feature_unavailable_note",
      false,
      "If popup says Feature Unavailable: Meta blocks FB Login at app level (not Growvisi code). Check Data Use Checkup, App Review advanced permissions, and FB Login for Business Settings.",
    );

    return result;
  }

  async completeSignup(
    user: JwtPayload,
    input: {
      code: string;
      phoneNumberId: string;
      wabaId: string;
      finishEvent?: string;
    },
  ): Promise<WhatsappAccountSafe> {
    if (!this.getPublicConfig().enabled) {
      throw new BadRequestException(
        "WhatsApp connection is not available yet. Please contact support.",
      );
    }

    const phoneNumberId = input.phoneNumberId.trim();
    const wabaId = input.wabaId.trim();

    if (input.finishEvent === "FINISH_ONLY_WABA" || !phoneNumberId) {
      throw new BadRequestException(
        "Please finish adding your business phone number in the Meta setup window.",
      );
    }

    const duplicate = await this.prisma.whatsappAccount.findFirst({
      where: { organizationId: user.organizationId, phoneNumberId },
    });
    if (duplicate) {
      throw new BadRequestException("This WhatsApp number is already connected to your workspace.");
    }

    const businessToken = await this.exchangeCode(input.code.trim());
    await this.subscribeWebhooks(wabaId, businessToken);
    await this.tryRegisterPhone(phoneNumberId, businessToken);

    const details = await this.fetchPhoneDetails(phoneNumberId, businessToken);

    const account = await this.prisma.whatsappAccount.create({
      data: {
        organizationId: user.organizationId,
        phoneNumberId,
        wabaId,
        displayPhoneNumber: details.display_phone_number?.trim() || phoneNumberId,
        verifiedName: details.verified_name ?? null,
        accessTokenEnc: encryptSecret(businessToken),
      },
    });

    this.logger.log(
      `Embedded signup complete org=${user.organizationId} phone=${account.displayPhoneNumber}`,
    );

    return {
      id: account.id,
      phoneNumberId: account.phoneNumberId,
      wabaId: account.wabaId,
      displayPhoneNumber: account.displayPhoneNumber,
      verifiedName: account.verifiedName,
      isActive: account.isActive,
      hasAccessToken: true,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private async exchangeCode(code: string): Promise<string> {
    const version = this.apiVersion();
    const params = new URLSearchParams({
      client_id: sanitizeEnvValue(this.config.get<string>("META_APP_ID"))!,
      client_secret: this.appSecret()!,
      code,
    });

    const url = `https://graph.facebook.com/${version}/oauth/access_token?${params}`;
    const res = await fetch(url);
    const body = (await res.json()) as { access_token?: string; error?: { message?: string } };

    if (!res.ok || !body.access_token) {
      throw new BadRequestException(
        body.error?.message ??
          "Could not complete Facebook authorization. Please try connecting again.",
      );
    }

    return body.access_token;
  }

  private async subscribeWebhooks(wabaId: string, businessToken: string) {
    const version = this.apiVersion();
    const res = await fetch(`https://graph.facebook.com/${version}/${wabaId}/subscribed_apps`, {
      method: "POST",
      headers: { Authorization: `Bearer ${businessToken}` },
    });
    const body = (await res.json()) as { success?: boolean; error?: { message?: string } };

    if (!res.ok || !body.success) {
      this.logger.warn(`WABA webhook subscribe failed: ${body.error?.message ?? res.status}`);
      throw new BadRequestException(
        body.error?.message ?? "Could not enable message delivery for your WhatsApp account.",
      );
    }
  }

  private async tryRegisterPhone(phoneNumberId: string, businessToken: string) {
    const pin = this.config.get<string>("META_WABA_REGISTER_PIN");
    if (!pin || pin.length !== 6) {
      this.logger.debug("Skipping phone register — META_WABA_REGISTER_PIN not set");
      return;
    }

    const version = this.apiVersion();
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${businessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", pin }),
    });

    const body = (await res.json()) as { success?: boolean; error?: { message?: string } };
    if (body.success) {
      return;
    }

    const msg = body.error?.message ?? "";
    if (/already registered/i.test(msg)) {
      return;
    }

    this.logger.warn(`Phone register skipped: ${msg}`);
  }

  private async fetchPhoneDetails(phoneNumberId: string, accessToken: string) {
    const version = this.apiVersion();
    const url = `https://graph.facebook.com/${version}/${phoneNumberId}?fields=display_phone_number,verified_name`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const body = (await res.json()) as {
      display_phone_number?: string;
      verified_name?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new BadRequestException(body.error?.message ?? "Could not verify your WhatsApp number.");
    }
    return body;
  }

  private apiVersion() {
    return sanitizeEnvValue(this.config.get<string>("WHATSAPP_API_VERSION")) ?? "v22.0";
  }

  private appSecret() {
    return sanitizeEnvValue(
      this.config.get<string>("META_APP_SECRET") ??
        this.config.get<string>("WHATSAPP_APP_SECRET"),
    );
  }
}
