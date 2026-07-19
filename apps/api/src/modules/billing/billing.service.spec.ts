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
  } as unknown as RazorpayService;

  const entitlements = {} as EntitlementsService;
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

  it("blocks checkout when subscription is already ACTIVE", async () => {
    (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      organizationId: "org_1",
      planId: "growth",
      status: "ACTIVE",
    });

    await expect(service.createCheckout(owner, "pro")).rejects.toBeInstanceOf(BadRequestException);
    expect(razorpay.createSubscription).not.toHaveBeenCalled();
  });

  it("allows checkout while still TRIALING", async () => {
    (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      organizationId: "org_1",
      planId: "trial",
      status: "TRIALING",
    });

    const result = await service.createCheckout(owner, "starter");
    expect(result.checkoutUrl).toContain("https://");
    expect(razorpay.createSubscription).toHaveBeenCalled();
  });
});
