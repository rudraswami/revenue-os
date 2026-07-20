import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRefreshBody, planRefreshRequest } from "./auth-refresh-plan";

describe("auth-refresh-plan", () => {
  it("uses cookie-only when no fallback token exists", () => {
    assert.deepEqual(planRefreshRequest(null, true), { mode: "cookie_only" });
    assert.deepEqual(planRefreshRequest("", false), { mode: "cookie_only" });
  });

  it("combines cookie + body when session hint and fallback exist", () => {
    const plan = planRefreshRequest("valid-rotated-token", true);
    assert.equal(plan.mode, "cookie_and_body");
    if (plan.mode === "cookie_and_body") {
      assert.equal(plan.body, buildRefreshBody("valid-rotated-token"));
    }
  });

  it("uses body-only when fallback exists but no cookie hint", () => {
    const plan = planRefreshRequest("valid-token", false);
    assert.equal(plan.mode, "body_only");
    if (plan.mode === "body_only") {
      assert.equal(plan.body, buildRefreshBody("valid-token"));
    }
  });
});
