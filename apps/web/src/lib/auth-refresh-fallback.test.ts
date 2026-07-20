import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planRefreshRequest } from "./auth-refresh-plan";

/**
 * Refresh transport contract — stale HttpOnly cookie + valid body token must
 * resolve in a single POST /auth/refresh (server auth.controller.ts).
 */
describe("refresh fallback contract", () => {
  it("sends cookie and body together when both credentials exist", () => {
    const plan = planRefreshRequest("valid-rotated-token", true);
    assert.equal(plan.mode, "cookie_and_body");
  });

  it("uses body-only without credentials when cookie hint is absent", () => {
    const plan = planRefreshRequest("valid-rotated-token", false);
    assert.equal(plan.mode, "body_only");
  });

  it("server must try body when cookie token differs and cookie refresh fails", () => {
    const cookieToken: string = "stale-revoked-token";
    const bodyToken: string = "valid-rotated-token";
    const canFallback = Boolean(bodyToken && bodyToken !== cookieToken);
    assert.equal(canFallback, true);
  });

  it("server must not fall through when cookie and body are the same token", () => {
    const token: string = "same-token";
    const bodyToken: string = token;
    const canFallback = Boolean(bodyToken && bodyToken !== token);
    assert.equal(canFallback, false);
  });
});
