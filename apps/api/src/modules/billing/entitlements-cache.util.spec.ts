import { resolveCachedEntitlements, toCachedEntitlementsInput } from "./entitlements-cache.util";

describe("entitlements-cache.util", () => {
  it("re-resolves trial expiry on cache hit without DB", () => {
    const createdAt = new Date();
    createdAt.setUTCDate(createdAt.getUTCDate() - 20);

    const snapshot = toCachedEntitlementsInput({
      planId: "trial",
      status: "TRIALING",
      createdAt,
    });

    const access = resolveCachedEntitlements(snapshot);
    expect(access.trialExpired).toBe(true);
    expect(access.hasAccess).toBe(false);
  });

  it("keeps active paid access on cache hit", () => {
    const snapshot = toCachedEntitlementsInput({
      planId: "growth",
      status: "ACTIVE",
      createdAt: new Date("2026-01-01"),
      currentPeriodEnd: new Date("2026-08-01"),
    });

    const access = resolveCachedEntitlements(snapshot);
    expect(access.hasAccess).toBe(true);
    expect(access.planId).toBe("growth");
  });
});
