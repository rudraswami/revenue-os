import { EntitlementsService } from "./entitlements.service";
import { PrismaService } from "../prisma/prisma.service";
import { ServerCacheService } from "../server-cache/server-cache.service";

describe("EntitlementsService access cache", () => {
  const prisma = {
    subscription: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    organizationMember: { findFirst: jest.fn() },
  } as unknown as PrismaService;

  const cache = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    invalidateEntitlements: jest.fn().mockResolvedValue(undefined),
    invalidateShellBootstrap: jest.fn().mockResolvedValue(undefined),
  } as unknown as ServerCacheService;

  const service = new EntitlementsService(prisma, cache);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.META_REVIEWER_BYPASS = "false";
  });

  it("re-resolves trial expiry from cached snapshot without DB", async () => {
    const createdAt = new Date();
    createdAt.setUTCDate(createdAt.getUTCDate() - 20);

    (cache.get as jest.Mock).mockResolvedValue({
      planId: "trial",
      status: "TRIALING",
      createdAt: createdAt.toISOString(),
      currentPeriodEnd: null,
    });

    const access = await service.getAccess("org_1");

    expect(access.trialExpired).toBe(true);
    expect(access.hasAccess).toBe(false);
    expect(prisma.subscription.findUnique).not.toHaveBeenCalled();
  });

  it("loads access and writes snapshot on miss", async () => {
    (cache.get as jest.Mock).mockResolvedValue(null);
    (prisma.subscription.findUnique as jest.Mock).mockResolvedValue({
      planId: "growth",
      status: "ACTIVE",
      createdAt: new Date("2026-01-01"),
      currentPeriodEnd: null,
    });

    const access = await service.getAccess("org_2");

    expect(access.planId).toBe("growth");
    expect(cache.set).toHaveBeenCalledWith(
      "gv:entitlements:org_2",
      expect.objectContaining({
        planId: "growth",
        status: "ACTIVE",
        createdAt: expect.any(String),
      }),
      60,
    );
  });

  it("does not cache meta reviewer bypass orgs", async () => {
    process.env.META_REVIEWER_BYPASS = "true";
    process.env.SEED_META_REVIEWER_EMAIL = "meta@test.com";
    (cache.get as jest.Mock).mockResolvedValue(null);
    (prisma.organizationMember.findFirst as jest.Mock).mockResolvedValue({ id: "m1" });

    const access = await service.getAccess("org_meta");

    expect(access.planId).toBe("pro");
    expect(cache.set).not.toHaveBeenCalled();
  });

  it("invalidateAccessCache deletes entitlements key and bumps shell bootstrap", async () => {
    await service.invalidateAccessCache("org_3");
    expect(cache.invalidateEntitlements).toHaveBeenCalledWith("org_3");
    expect(cache.invalidateShellBootstrap).toHaveBeenCalledWith("org_3");
  });
});
