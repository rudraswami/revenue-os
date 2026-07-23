import { BadRequestException } from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { BillingService } from "./billing.service";
import { EntitlementsService } from "./entitlements.service";
import { RazorpayService } from "./razorpay.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

describe("BillingService.createCheckout", () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    subscription: { findUnique: jest.fn(), upsert: jest.fn() },
  } as unknown as PrismaService;

  const razorpay = {
    isConfigured: jest.fn(),
    createSubscription: jest.fn(),
    planIdFor: jest.fn(() => "plan_test"),
    changeSubscriptionPlan: jest.fn(),
    cancelSubscriptionImmediately: jest.fn(),
    fetchSubscription: jest.fn(),
    getKeyId: jest.fn(() => "rzp_test_key"),
  } as unknown as RazorpayService;

  const entitlements = {
    invalidateAccessCache: jest.fn(),
  } as unknown as EntitlementsService;
  const audit = { log: jest.fn() } as unknown as AuditService;

  const service = new BillingService(prisma, razorpay, entitlements, audit);

  const owner: JwtPayload = {
    sub: "user_1",
    organizationId: "org_1",
    role: "OWNER",
    email: "owner@test.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.subscription.update as jest.Mock) = jest.fn().mockResolvedValue({});
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      email: "owner@test.com",
      name: "Owner",
    });
    (razorpay.createSubscription as jest.Mock).mockResolvedValue({
      customerId: "cust_1",
      subscriptionId: "sub_1",
      checkoutUrl: "https://rzp.test/checkout",
    });
  });

  it("blocks checkout when already on the same ACTIVE plan", async () => {
    (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      organizationId: "org_1",
      planId: "growth",
      status: "ACTIVE",
      razorpaySubscriptionId: "sub_existing",
    });

    await expect(service.createCheckout(owner, "growth")).rejects.toBeInstanceOf(BadRequestException);
    expect(razorpay.createSubscription).not.toHaveBeenCalled();
  });

  it("changes plan when ACTIVE on a different tier", async () => {
    (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      organizationId: "org_1",
      planId: "starter",
      status: "ACTIVE",
      razorpaySubscriptionId: "sub_existing",
    });
    (razorpay as unknown as { changeSubscriptionPlan: jest.Mock }).changeSubscriptionPlan =
      jest.fn().mockResolvedValue({ id: "sub_existing" });
    (prisma.subscription.update as jest.Mock) = jest.fn().mockResolvedValue({});

    const result = await service.createCheckout(owner, "growth");
    expect(result.planChange).toBe(true);
    expect(razorpay.createSubscription).not.toHaveBeenCalled();
  });

  it("allows checkout while still TRIALING", async () => {
    (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      organizationId: "org_1",
      planId: "trial",
      status: "TRIALING",
    });

    const result = await service.createCheckout(owner, "starter");
    expect(result.subscriptionId).toBe("sub_1");
    expect(result.razorpayKeyId).toBeTruthy();
    expect(razorpay.createSubscription).toHaveBeenCalled();
  });

  it("throws when plan change fails without resetting subscription", async () => {
    (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      organizationId: "org_1",
      planId: "starter",
      status: "ACTIVE",
      razorpaySubscriptionId: "sub_existing",
    });
    (razorpay as unknown as { changeSubscriptionPlan: jest.Mock }).changeSubscriptionPlan =
      jest.fn().mockRejectedValue(new Error("Razorpay unavailable"));

    await expect(service.createCheckout(owner, "growth")).rejects.toBeInstanceOf(BadRequestException);
    expect(razorpay.cancelSubscriptionImmediately).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it("returns payment retry checkout for PAST_DUE subscriptions", async () => {
    (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      organizationId: "org_1",
      planId: "growth",
      status: "PAST_DUE",
      razorpaySubscriptionId: "sub_past_due",
    });

    const result = await service.createCheckout(owner, "growth");
    expect(result.paymentRetry).toBe(true);
    expect(result.subscriptionId).toBe("sub_past_due");
    expect(razorpay.createSubscription).not.toHaveBeenCalled();
  });
});

describe("BillingService.handleWebhook", () => {
  const prisma = {
    webhookEvent: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    subscription: { findFirst: jest.fn(), update: jest.fn() },
  } as unknown as PrismaService;

  const razorpay = {} as unknown as RazorpayService;
  const entitlements = { invalidateAccessCache: jest.fn() } as unknown as EntitlementsService;
  const audit = { log: jest.fn() } as unknown as AuditService;
  const service = new BillingService(prisma, razorpay, entitlements, audit);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.webhookEvent.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.webhookEvent.create as jest.Mock).mockResolvedValue({ id: "evt_1" });
    (prisma.webhookEvent.update as jest.Mock).mockResolvedValue({});
    (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
      id: "sub_db_1",
      organizationId: "org_1",
      planId: "trial",
      status: "TRIALING",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    (prisma.subscription.update as jest.Mock).mockResolvedValue({});
  });

  it("activates subscription from webhook", async () => {
    const periodEnd = Math.floor(Date.now() / 1000) + 86_400;
    const result = await service.handleWebhook({
      event: "subscription.activated",
      payload: {
        subscription: {
          entity: {
            id: "sub_rzp_1",
            status: "active",
            current_end: periodEnd,
            notes: { organizationId: "org_1", planId: "growth" },
          },
        },
      },
    });

    expect(result.handled).toBe(true);
    expect(result.status).toBe("ACTIVE");
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACTIVE", planId: "growth" }),
      }),
    );
    expect(entitlements.invalidateAccessCache).toHaveBeenCalledWith("org_1");
  });

  it("marks subscription canceled from webhook", async () => {
    (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
      id: "sub_db_1",
      organizationId: "org_1",
      planId: "growth",
      status: "ACTIVE",
      currentPeriodEnd: new Date(),
      cancelAtPeriodEnd: true,
    });

    const result = await service.handleWebhook({
      event: "subscription.cancelled",
      payload: {
        subscription: {
          entity: {
            id: "sub_rzp_1",
            status: "cancelled",
          },
        },
      },
    });

    expect(result.handled).toBe(true);
    expect(result.status).toBe("CANCELED");
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELED", cancelAtPeriodEnd: false }),
      }),
    );
  });

  it("marks subscription past due when halted", async () => {
    const result = await service.handleWebhook({
      event: "subscription.halted",
      payload: {
        subscription: {
          entity: {
            id: "sub_rzp_1",
            status: "halted",
          },
        },
      },
    });

    expect(result.handled).toBe(true);
    expect(result.status).toBe("PAST_DUE");
  });

  it("dedupes identical webhook events", async () => {
    (prisma.webhookEvent.findFirst as jest.Mock).mockResolvedValue({ id: "evt_prior" });

    const result = await service.handleWebhook({
      event: "subscription.activated",
      payload: {
        subscription: {
          entity: { id: "sub_rzp_1", status: "active", current_end: 1_700_000_000 },
        },
      },
    });

    expect(result.duplicate).toBe(true);
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });
});
