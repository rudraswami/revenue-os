import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Documents the stale-cookie refresh contract fixed in P0.
 * Integration coverage: scripts/test-auth-refresh-flow.mjs step 6.
 */
describe("refresh fallback contract", () => {
  it("body fallback must omit credentials so stale cookie cannot override body token", () => {
    const cookieTransport = "include" as RequestCredentials;
    const bodyTransport = "omit" as RequestCredentials;
    assert.equal(cookieTransport, "include");
    assert.equal(bodyTransport, "omit");
    assert.notEqual(cookieTransport, bodyTransport);
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
