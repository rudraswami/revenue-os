import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveApiBaseUrl, resolveWsBaseUrl } from "./growvisi-host";

describe("growvisi-host", () => {
  it("routes .in production host to api.growvisi.in", () => {
    assert.equal(resolveApiBaseUrl("www.growvisi.in"), "https://api.growvisi.in/api/v1");
    assert.equal(resolveWsBaseUrl("www.growvisi.in"), "wss://api.growvisi.in");
  });

  it("routes .com production host to api.growvisi.com", () => {
    assert.equal(resolveApiBaseUrl("www.growvisi.com"), "https://api.growvisi.com/api/v1");
    assert.equal(resolveWsBaseUrl("www.growvisi.com"), "wss://api.growvisi.com");
  });

  it("falls back to env for localhost", () => {
    const api = resolveApiBaseUrl("localhost");
    assert.ok(api.includes("/api/v1"));
  });
});
