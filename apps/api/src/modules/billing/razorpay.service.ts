import { createHmac, timingSafeEqual } from "crypto";
import { BadRequestException, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GROWVISI_PLANS,
  type GrowvisiPlanId,
  PAID_PLAN_IDS,
} from "@growvisi/shared";
import { isProductionDeploy } from "../../config/production";

interface RazorpaySubscription {
  id: string;
  status: string;
  short_url?: string;
  current_end?: number;
  plan_id?: string;
  customer_id?: string;
}

@Injectable()
export class RazorpayService implements OnModuleInit {
  private readonly logger = new Logger(RazorpayService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (!this.isConfigured()) return;

    const missingPlans = PAID_PLAN_IDS.filter((id) => !this.planIdFor(id));
    if (missingPlans.length > 0) {
      this.logger.warn(
        `Razorpay API keys set but plan IDs missing for: ${missingPlans.join(", ")}. ` +
          "Checkout will fail until RAZORPAY_PLAN_STARTER/GROWTH/PRO are set.",
      );
      return;
    }

    this.logger.log("Razorpay billing ready — Solo, Team, and Operator plans configured.");

    if (isProductionDeploy() && !this.config.get<string>("RAZORPAY_WEBHOOK_SECRET")?.trim()) {
      this.logger.error(
        "RAZORPAY_WEBHOOK_SECRET missing in production — subscription webhooks will be rejected. " +
          "Add webhook at https://api.growvisi.in/api/v1/webhooks/razorpay",
      );
    }
  }

  isConfigured(): boolean {
    return !!(this.keyId() && this.keySecret());
  }

  arePlansConfigured(): boolean {
    return PAID_PLAN_IDS.every((id) => !!this.planIdFor(id));
  }

  isCheckoutReady(): boolean {
    return this.isConfigured() && this.arePlansConfigured();
  }

  planCatalog() {
    return PAID_PLAN_IDS.map((id) => {
      const plan = GROWVISI_PLANS[id];
      return {
        id: plan.id,
        name: plan.name,
        priceInr: plan.priceInr,
        description: plan.description,
        available: !!this.planIdFor(id),
      };
    });
  }

  planIdFor(planId: GrowvisiPlanId): string | null {
    const plan = GROWVISI_PLANS[planId];
    if (!plan.razorpayPlanEnvKey) return null;
    return this.config.get<string>(plan.razorpayPlanEnvKey)?.trim() || null;
  }

  async createSubscription(opts: {
    planId: GrowvisiPlanId;
    organizationId: string;
    customerEmail: string;
    customerName?: string | null;
    existingCustomerId?: string | null;
  }): Promise<{ subscriptionId: string; checkoutUrl: string; customerId: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        "Razorpay is not configured on this deployment. Contact it@growvisi.com.",
      );
    }

    const razorpayPlanId = this.planIdFor(opts.planId);
    if (!razorpayPlanId) {
      throw new BadRequestException(
        `Plan ${opts.planId} is not configured yet. Set ${GROWVISI_PLANS[opts.planId].razorpayPlanEnvKey} on the API.`,
      );
    }

    const customerId =
      opts.existingCustomerId ??
      (await this.createCustomer(opts.customerEmail, opts.customerName));

    const body = {
      plan_id: razorpayPlanId,
      customer_id: customerId,
      total_count: 120,
      customer_notify: 1,
      notes: {
        organizationId: opts.organizationId,
        planId: opts.planId,
      },
    };

    const subscription = await this.request<RazorpaySubscription>("POST", "/subscriptions", body);
    if (!subscription.short_url) {
      throw new BadRequestException("Razorpay did not return a checkout URL.");
    }

    return {
      subscriptionId: subscription.id,
      checkoutUrl: subscription.short_url,
      customerId,
    };
  }

  /** Cancel at end of current billing cycle. */
  async cancelSubscription(razorpaySubscriptionId: string) {
    return this.request<RazorpaySubscription>(
      "POST",
      `/subscriptions/${razorpaySubscriptionId}/cancel`,
      { cancel_at_cycle_end: 1 },
    );
  }

  verifyWebhookSignature(body: string, signature: string | undefined): boolean {
    const secret = this.config.get<string>("RAZORPAY_WEBHOOK_SECRET")?.trim();
    if (!secret) {
      if (isProductionDeploy()) {
        this.logger.error("RAZORPAY_WEBHOOK_SECRET missing in production — rejecting webhook");
        return false;
      }
      this.logger.warn("RAZORPAY_WEBHOOK_SECRET not set — skipping webhook verification");
      return true;
    }
    if (!signature) return false;
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  private async createCustomer(email: string, name?: string | null): Promise<string> {
    const customer = await this.request<{ id: string }>("POST", "/customers", {
      email,
      name: name?.trim() || email.split("@")[0],
      fail_existing: "0",
    });
    return customer.id;
  }

  private keyId() {
    return this.config.get<string>("RAZORPAY_KEY_ID")?.trim();
  }

  private keySecret() {
    return this.config.get<string>("RAZORPAY_KEY_SECRET")?.trim();
  }

  private async request<T>(method: string, path: string, body?: object): Promise<T> {
    const keyId = this.keyId();
    const keySecret = this.keySecret();
    if (!keyId || !keySecret) {
      throw new BadRequestException("Razorpay credentials missing.");
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });

    const data = (await res.json()) as T & { error?: { description?: string } };
    if (!res.ok) {
      this.logger.warn(`Razorpay ${method} ${path} failed: ${data.error?.description ?? res.status}`);
      throw new BadRequestException(data.error?.description ?? "Razorpay request failed.");
    }
    return data;
  }
}
