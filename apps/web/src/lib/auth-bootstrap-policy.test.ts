import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canRenderDashboardWhileRestoringSession,
  shouldRunBootstrapOnHydrate,
} from "./auth-bootstrap-policy";

describe("shouldRunBootstrapOnHydrate", () => {
  it("skips when there is no session signal", () => {
    assert.equal(
      shouldRunBootstrapOnHydrate({
        refreshToken: null,
        accessToken: null,
        hasSessionHint: false,
      }),
      false,
    );
  });

  it("runs when access token or session hint exists", () => {
    assert.equal(
      shouldRunBootstrapOnHydrate({
        refreshToken: null,
        accessToken: "jwt",
        hasSessionHint: false,
      }),
      true,
    );
    assert.equal(
      shouldRunBootstrapOnHydrate({
        refreshToken: null,
        accessToken: null,
        hasSessionHint: true,
      }),
      true,
    );
  });
});

describe("canRenderDashboardWhileRestoringSession", () => {
  it("allows render with a valid access token", () => {
    assert.equal(
      canRenderDashboardWhileRestoringSession({
        accessToken: "jwt",
        user: null,
        hasSessionHint: false,
        hasTransientFailure: false,
      }),
      true,
    );
  });

  it("allows shell with persisted profile while cookie refresh runs", () => {
    assert.equal(
      canRenderDashboardWhileRestoringSession({
        accessToken: null,
        user: { id: "u1" },
        hasSessionHint: true,
        hasTransientFailure: false,
      }),
      true,
    );
  });

  it("blocks shell when restoring without persisted identity", () => {
    assert.equal(
      canRenderDashboardWhileRestoringSession({
        accessToken: null,
        user: null,
        hasSessionHint: true,
        hasTransientFailure: false,
      }),
      false,
    );
  });
});
