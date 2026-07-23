import { PAID_RENEWAL_GRACE_MS, resolveSubscriptionAccess, TRIAL_DAYS } from "@growvisi/shared";

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

  it("keeps access when canceled early but current period has not ended", () => {
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setUTCDate(currentPeriodEnd.getUTCDate() + 10);
    const access = resolveSubscriptionAccess({
      planId: "growth",
      status: "CANCELED",
      createdAt: new Date(),
      currentPeriodEnd,
    });
    expect(access.hasAccess).toBe(true);
    expect(access.requiresUpgrade).toBe(false);
  });

  it("blocks access when canceled and paid period has ended", () => {
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setUTCDate(currentPeriodEnd.getUTCDate() - 1);
    const access = resolveSubscriptionAccess({
      planId: "growth",
      status: "CANCELED",
      createdAt: new Date(),
      currentPeriodEnd,
    });
    expect(access.hasAccess).toBe(false);
    expect(access.requiresUpgrade).toBe(true);
  });

  it("grants short grace when ACTIVE past currentPeriodEnd (renewal webhook delay)", () => {
    const currentPeriodEnd = new Date(Date.now() - PAID_RENEWAL_GRACE_MS / 2);
    const access = resolveSubscriptionAccess({
      planId: "pro",
      status: "ACTIVE",
      createdAt: new Date(),
      currentPeriodEnd,
    });
    expect(access.hasAccess).toBe(true);
  });

  it("blocks access when ACTIVE grace window has elapsed", () => {
    const currentPeriodEnd = new Date(Date.now() - PAID_RENEWAL_GRACE_MS - 1_000);
    const access = resolveSubscriptionAccess({
      planId: "pro",
      status: "ACTIVE",
      createdAt: new Date(),
      currentPeriodEnd,
    });
    expect(access.hasAccess).toBe(false);
  });

  it("blocks access for PAST_DUE even within paid period", () => {
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setUTCDate(currentPeriodEnd.getUTCDate() + 5);
    const access = resolveSubscriptionAccess({
      planId: "starter",
      status: "PAST_DUE",
      createdAt: new Date(),
      currentPeriodEnd,
    });
    expect(access.hasAccess).toBe(false);
    expect(access.requiresUpgrade).toBe(true);
  });
});
