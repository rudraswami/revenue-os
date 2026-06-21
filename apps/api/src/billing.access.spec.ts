import { resolveSubscriptionAccess, TRIAL_DAYS } from "@growvisi/shared";

describe("resolveSubscriptionAccess", () => {
  it("grants access during active trial", () => {
    const createdAt = new Date();
    const access = resolveSubscriptionAccess({
      planId: "trial",
      status: "TRIALING",
      createdAt,
    });
    expect(access.hasAccess).toBe(true);
    expect(access.trialExpired).toBe(false);
    expect(access.limits.whatsappNumbers).toBe(1);
  });

  it("blocks access after trial expires", () => {
    const createdAt = new Date();
    createdAt.setUTCDate(createdAt.getUTCDate() - (TRIAL_DAYS + 1));
    const access = resolveSubscriptionAccess({
      planId: "trial",
      status: "TRIALING",
      createdAt,
    });
    expect(access.trialExpired).toBe(true);
    expect(access.hasAccess).toBe(false);
    expect(access.requiresUpgrade).toBe(true);
  });

  it("grants access for active paid plans", () => {
    const access = resolveSubscriptionAccess({
      planId: "growth",
      status: "ACTIVE",
      createdAt: new Date(),
    });
    expect(access.hasAccess).toBe(true);
    expect(access.limits.teamMembers).toBe(5);
  });
});
