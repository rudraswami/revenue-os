import { isCachedMembership, isMembershipRole } from "./membership-cache.util";

describe("membership-cache.util", () => {
  it("accepts valid membership roles", () => {
    expect(isMembershipRole("ADMIN")).toBe(true);
    expect(isMembershipRole("SUPERADMIN")).toBe(false);
  });

  it("validates cached membership shape", () => {
    expect(isCachedMembership({ role: "AGENT", userStatus: "ACTIVE" })).toBe(true);
    expect(isCachedMembership({ role: "AGENT" })).toBe(false);
    expect(isCachedMembership(null)).toBe(false);
  });
});
