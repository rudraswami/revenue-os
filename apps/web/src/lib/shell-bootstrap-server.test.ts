import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { fetchShellBootstrapServer } from "./shell-bootstrap-server";

const SESSION = "growvisi-session=1";
const REFRESH = "growvisi_rt=abc";

describe("fetchShellBootstrapServer", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns null without session cookie", async () => {
    const result = await fetchShellBootstrapServer(`${REFRESH}`);
    assert.equal(result, null);
  });

  it("returns null without refresh cookie", async () => {
    const result = await fetchShellBootstrapServer(`${SESSION}`);
    assert.equal(result, null);
  });

  it("returns null when refresh fails", async () => {
    globalThis.fetch = (async () =>
      ({ ok: false, status: 401, json: async () => null } as Response)) as typeof fetch;

    const result = await fetchShellBootstrapServer(`${SESSION}; ${REFRESH}`);
    assert.equal(result, null);
  });

  it("fetches shell-bootstrap after successful refresh", async () => {
    const bootstrap = { me: { id: "u1" }, billing: { planId: "starter" } };
    let call = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      call += 1;
      const url = String(input);
      if (url.includes("/auth/refresh")) {
        return {
          ok: true,
          json: async () => ({ accessToken: "tok" }),
        } as Response;
      }
      if (url.includes("/organizations/shell-bootstrap")) {
        return {
          ok: true,
          json: async () => bootstrap,
        } as Response;
      }
      throw new Error(`unexpected url ${url}`);
    }) as typeof fetch;

    const result = await fetchShellBootstrapServer(`${SESSION}; ${REFRESH}`);
    assert.equal(call, 2);
    assert.deepEqual(result, bootstrap);
  });
});
