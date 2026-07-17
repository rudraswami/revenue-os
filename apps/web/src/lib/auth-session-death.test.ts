import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyRefreshFailure,
  customerMessageForRefresh,
  isConclusiveAuthDeath,
  logoutReasonFromRefresh,
} from "./auth-session-death";

describe("isConclusiveAuthDeath", () => {
  it("allows only AUTH_* kinds to end a session", () => {
    assert.equal(isConclusiveAuthDeath("SUCCESS"), false);
    assert.equal(isConclusiveAuthDeath("NETWORK_FAILURE"), false);
    assert.equal(isConclusiveAuthDeath("SERVER_FAILURE"), false);
    assert.equal(isConclusiveAuthDeath("AUTH_EXPIRED"), true);
    assert.equal(isConclusiveAuthDeath("AUTH_REVOKED"), true);
    assert.equal(isConclusiveAuthDeath("AUTH_INVALID"), true);
  });
});

describe("classifyRefreshFailure", () => {
  it("maps status 0 to NETWORK_FAILURE (T4 offline)", () => {
    const r = classifyRefreshFailure(0, "offline", 10, 0);
    assert.equal(r.kind, "NETWORK_FAILURE");
    assert.equal(isConclusiveAuthDeath(r.kind), false);
  });

  it("maps 503/500/429 to SERVER_FAILURE (T3)", () => {
    assert.equal(classifyRefreshFailure(503, "down", 10, 0).kind, "SERVER_FAILURE");
    assert.equal(classifyRefreshFailure(500, "err", 10, 0).kind, "SERVER_FAILURE");
    assert.equal(classifyRefreshFailure(429, "slow", 10, 0).kind, "SERVER_FAILURE");
  });

  it("maps 401 session expired to AUTH_EXPIRED (T2)", () => {
    const r = classifyRefreshFailure(401, "Session expired. Please sign in again.", 12, 0);
    assert.equal(r.kind, "AUTH_EXPIRED");
    assert.equal(logoutReasonFromRefresh(r.kind), "REFRESH_TOKEN_EXPIRED");
  });

  it("maps 401 revoked to AUTH_REVOKED", () => {
    const r = classifyRefreshFailure(401, "Token revoked", 12, 0);
    assert.equal(r.kind, "AUTH_REVOKED");
    assert.equal(logoutReasonFromRefresh(r.kind), "TOKEN_REVOKED");
  });

  it("maps other 401 to AUTH_INVALID", () => {
    const r = classifyRefreshFailure(401, "Unauthorized", 12, 0);
    assert.equal(r.kind, "AUTH_INVALID");
  });
});

describe("customerMessageForRefresh", () => {
  it("does not say session expired for network/server", () => {
    assert.match(customerMessageForRefresh("NETWORK_FAILURE"), /still saved|connection/i);
    assert.match(customerMessageForRefresh("SERVER_FAILURE"), /still signed in/i);
    assert.doesNotMatch(customerMessageForRefresh("NETWORK_FAILURE"), /session expired/i);
  });

  it("says sign in again only for auth death", () => {
    assert.match(customerMessageForRefresh("AUTH_EXPIRED"), /sign in again/i);
  });
});
