import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accessTokenIsExpired,
  accessTokenNeedsRefresh,
  REFRESH_BEFORE_SEC,
} from "./session-continuity";

function jwtWithExp(offsetSec: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + offsetSec }),
  ).toString("base64url");
  return `${header}.${payload}.sig`;
}

describe("session-continuity", () => {
  it("needs refresh within REFRESH_BEFORE_SEC window", () => {
    assert.equal(accessTokenNeedsRefresh(jwtWithExp(REFRESH_BEFORE_SEC - 1)), true);
    assert.equal(accessTokenNeedsRefresh(jwtWithExp(REFRESH_BEFORE_SEC + 120)), false);
  });

  it("treats near-zero expiry as expired", () => {
    assert.equal(accessTokenIsExpired(jwtWithExp(30)), true);
    assert.equal(accessTokenIsExpired(jwtWithExp(600)), false);
  });
});
