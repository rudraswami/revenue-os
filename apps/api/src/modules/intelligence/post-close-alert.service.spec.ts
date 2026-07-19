import { POST_CLOSE_ALERT_COOLDOWN_MS, PostCloseAlertService } from "./post-close-alert.service";

describe("PostCloseAlertService", () => {
  const service = new PostCloseAlertService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  it("isWithinCooldown returns false when no prior alert", () => {
    expect(service.isWithinCooldown(undefined)).toBe(false);
    expect(service.isWithinCooldown("")).toBe(false);
  });

  it("isWithinCooldown returns true inside 4h window", () => {
    const recent = new Date(Date.now() - POST_CLOSE_ALERT_COOLDOWN_MS + 60_000).toISOString();
    expect(service.isWithinCooldown(recent)).toBe(true);
  });

  it("isWithinCooldown returns false after 4h window", () => {
    const old = new Date(Date.now() - POST_CLOSE_ALERT_COOLDOWN_MS - 1_000).toISOString();
    expect(service.isWithinCooldown(old)).toBe(false);
  });
});
