import assert from "node:assert/strict";
import test from "node:test";
import { jwtExpiresInSec } from "./jwt-expiry";

function makeJwt(expSec: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ exp: expSec })).toString("base64url");
  return `${header}.${payload}.sig`;
}

test("jwtExpiresInSec returns seconds until expiry", () => {
  const now = Math.floor(Date.now() / 1000);
  const token = makeJwt(now + 600);
  const remaining = jwtExpiresInSec(token);
  assert.ok(remaining !== null);
  assert.ok(remaining! >= 599 && remaining! <= 600);
});

test("jwtExpiresInSec returns null for invalid token", () => {
  assert.equal(jwtExpiresInSec("not-a-jwt"), null);
  assert.equal(jwtExpiresInSec("a.b"), null);
});
