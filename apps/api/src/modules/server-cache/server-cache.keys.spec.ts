import {
  entitlementsCacheKey,
  membershipCacheKey,
  onboardingCacheKey,
  queueStatsCacheKey,
  shellBootstrapCacheKey,
  shellBootstrapVersionKey,
} from "./server-cache.keys";

describe("server-cache keys", () => {
  it("builds entitlements key per org", () => {
    expect(entitlementsCacheKey("org_1")).toBe("gv:entitlements:org_1");
  });

  it("builds membership key per user and org", () => {
    expect(membershipCacheKey("user_1", "org_1")).toBe("gv:membership:user_1:org_1");
  });

  it("builds shell bootstrap keys per org and user", () => {
    expect(shellBootstrapVersionKey("org_1")).toBe("gv:shell-bootstrap-ver:org_1");
    expect(shellBootstrapCacheKey("org_1", "user_1")).toBe("gv:shell-bootstrap:org_1:user_1");
  });

  it("builds queue stats and onboarding keys", () => {
    expect(queueStatsCacheKey("org_1", "user_1")).toBe("gv:queue-stats:org_1:user_1");
    expect(onboardingCacheKey("org_1")).toBe("gv:onboarding:org_1");
  });
});
