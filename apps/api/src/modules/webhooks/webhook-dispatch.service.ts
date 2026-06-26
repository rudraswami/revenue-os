import { createHmac, randomBytes } from "crypto";
import { BadRequestException, ForbiddenException, Injectable, Logger } from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../billing/entitlements.service";
import {
  appendDelivery,
  MAX_ENDPOINTS,
  normalizeWebhooksConfig,
  type WebhookEndpoint,
  type WebhookEventType,
  type WebhooksConfig,
} from "../organizations/webhook-settings";

@Injectable()
export class WebhookDispatchService {
  private readonly logger = new Logger(WebhookDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async getConfig(organizationId: string): Promise<WebhooksConfig> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    return normalizeWebhooksConfig(settings.webhooks);
  }

  private async saveConfig(organizationId: string, config: WebhooksConfig) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          webhooks: config as object,
        },
      },
    });
  }

  private async assertPro(organizationId: string) {
    const access = await this.entitlements.getAccess(organizationId);
    if (access.planId !== "pro" || !access.hasAccess) {
      throw new ForbiddenException("Outbound webhooks are available on the Pro plan.");
    }
  }

  async list(user: JwtPayload) {
    await this.assertPro(user.organizationId);
    return this.getConfig(user.organizationId);
  }

  async createEndpoint(
    user: JwtPayload,
    input: {
      name: string;
      url: string;
      events: WebhookEventType[];
    },
  ) {
    await this.assertPro(user.organizationId);
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      throw new ForbiddenException("Only owners and admins can manage webhooks.");
    }

    const url = input.url.trim();
    if (!url.startsWith("https://")) {
      throw new BadRequestException("Webhook URL must use HTTPS.");
    }

    const config = await this.getConfig(user.organizationId);
    if (config.endpoints.length >= MAX_ENDPOINTS) {
      throw new BadRequestException(`Maximum ${MAX_ENDPOINTS} webhook endpoints per workspace.`);
    }

    const endpoint: WebhookEndpoint = {
      id: `wh_${randomBytes(6).toString("hex")}`,
      name: input.name.trim().slice(0, 80) || "Webhook",
      url,
      secret: `whsec_${randomBytes(16).toString("hex")}`,
      events: input.events.length ? input.events : ["lead.stage.changed"],
      enabled: true,
      createdAt: new Date().toISOString(),
    };

    const next = { ...config, endpoints: [...config.endpoints, endpoint] };
    await this.saveConfig(user.organizationId, next);
    return endpoint;
  }

  async updateEndpoint(
    user: JwtPayload,
    id: string,
    patch: Partial<Pick<WebhookEndpoint, "name" | "url" | "events" | "enabled">>,
  ) {
    await this.assertPro(user.organizationId);
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      throw new ForbiddenException("Only owners and admins can manage webhooks.");
    }

    const config = await this.getConfig(user.organizationId);
    const idx = config.endpoints.findIndex((e) => e.id === id);
    if (idx < 0) throw new BadRequestException("Webhook endpoint not found.");

    const current = config.endpoints[idx];
    if (patch.url && !patch.url.startsWith("https://")) {
      throw new BadRequestException("Webhook URL must use HTTPS.");
    }

    const updated: WebhookEndpoint = {
      ...current,
      name: patch.name?.trim().slice(0, 80) ?? current.name,
      url: patch.url?.trim() ?? current.url,
      events: patch.events?.length ? patch.events : current.events,
      enabled: patch.enabled ?? current.enabled,
    };

    const endpoints = [...config.endpoints];
    endpoints[idx] = updated;
    await this.saveConfig(user.organizationId, { ...config, endpoints });
    return updated;
  }

  async removeEndpoint(user: JwtPayload, id: string) {
    await this.assertPro(user.organizationId);
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      throw new ForbiddenException("Only owners and admins can manage webhooks.");
    }

    const config = await this.getConfig(user.organizationId);
    const next = {
      ...config,
      endpoints: config.endpoints.filter((e) => e.id !== id),
    };
    await this.saveConfig(user.organizationId, next);
    return { ok: true };
  }

  async sendTest(user: JwtPayload, id: string) {
    await this.assertPro(user.organizationId);
    const config = await this.getConfig(user.organizationId);
    const endpoint = config.endpoints.find((e) => e.id === id);
    if (!endpoint) throw new BadRequestException("Webhook endpoint not found.");

    await this.deliver(user.organizationId, endpoint, "lead.stage.changed", {
      test: true,
      leadId: "test_lead",
      fromStage: "NEW",
      toStage: "QUALIFIED",
      phone: "919876543210",
      displayName: "Test contact",
      at: new Date().toISOString(),
    });

    return { ok: true };
  }

  async emit(organizationId: string, event: WebhookEventType, payload: Record<string, unknown>) {
    const config = await this.getConfig(organizationId);
    const targets = config.endpoints.filter((e) => e.enabled && e.events.includes(event));
    if (targets.length === 0) return;

    for (const endpoint of targets) {
      void this.deliver(organizationId, endpoint, event, payload);
    }
  }

  private async deliver(
    organizationId: string,
    endpoint: WebhookEndpoint,
    event: WebhookEventType,
    payload: Record<string, unknown>,
  ) {
    const body = JSON.stringify({
      id: `evt_${randomBytes(8).toString("hex")}`,
      event,
      createdAt: new Date().toISOString(),
      organizationId,
      data: payload,
    });

    const signature = createHmac("sha256", endpoint.secret).update(body).digest("hex");
    let statusCode: number | null = null;
    let success = false;
    let error: string | undefined;

    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Growvisi-Event": event,
          "X-Growvisi-Signature": `sha256=${signature}`,
          "User-Agent": "Growvisi-Webhooks/1.0",
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      statusCode = res.status;
      success = res.ok;
      if (!res.ok) {
        error = `HTTP ${res.status}`;
      }
    } catch (err) {
      error = err instanceof Error ? err.message.slice(0, 200) : "Delivery failed";
      this.logger.warn(`Webhook ${endpoint.id} failed: ${error}`);
    }

    const config = await this.getConfig(organizationId);
    const next = appendDelivery(config, {
      endpointId: endpoint.id,
      event,
      statusCode,
      success,
      error,
    });
    await this.saveConfig(organizationId, next);
  }
}
