import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  loginReasonMessage,
  loginRedirectPath,
  logoutReasonToLoginParam,
} from "./auth-login-reason";

describe("auth-login-reason", () => {
  it("maps refresh expiry to session_expired", () => {
    assert.equal(logoutReasonToLoginParam("REFRESH_TOKEN_EXPIRED"), "session_expired");
    assert.equal(loginRedirectPath("REFRESH_TOKEN_EXPIRED"), "/login?reason=session_expired");
  });

  it("maps user sign out to signed_out", () => {
    assert.equal(logoutReasonToLoginParam("USER_SIGN_OUT"), "signed_out");
  });

  it("returns login messages for known params", () => {
    assert.match(loginReasonMessage("session_expired") ?? "", /expired/i);
    assert.equal(loginReasonMessage("unknown"), null);
  });
});
