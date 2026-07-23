import {
  isPaidSubscription,
  resolveOwnerStatus,
  resolveTrialUrgency,
} from "./agency-client-lifecycle";

describe("agency-client-lifecycle", () => {
  it("resolves owner status from membership and pending invite", () => {
    expect(resolveOwnerStatus(true, false)).toBe("owner_active");
    expect(resolveOwnerStatus(false, true)).toBe("invite_pending");
    expect(resolveOwnerStatus(false, false)).toBe("needs_owner");
    expect(resolveOwnerStatus(true, true)).toBe("owner_active");
  });

  it("flags trial ending soon within seven days", () => {
    const now = Date.parse("2026-07-01T00:00:00.000Z");
    const inFiveDays = new Date("2026-07-06T12:00:00.000Z");
    const inTenDays = new Date("2026-07-11T00:00:00.000Z");
    expect(resolveTrialUrgency("trial", inFiveDays, now)).toBe("ending_soon");
    expect(resolveTrialUrgency("trial", inTenDays, now)).toBe("none");
    expect(resolveTrialUrgency("growth", inFiveDays, now)).toBe("none");
  });

  it("flags expired trial window", () => {
    const now = Date.parse("2026-07-10T00:00:00.000Z");
    expect(resolveTrialUrgency("trial", new Date("2026-07-09T00:00:00.000Z"), now)).toBe(
      "expired",
    );
  });

  it("detects paid active subscriptions", () => {
    expect(isPaidSubscription("growth", "ACTIVE")).toBe(true);
    expect(isPaidSubscription("trial", "TRIALING")).toBe(false);
    expect(isPaidSubscription("pro", "PAST_DUE")).toBe(false);
  });
});
