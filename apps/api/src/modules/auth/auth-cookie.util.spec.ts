import type { Request } from "express";
import {
  clearRefreshCookie,
  resolveCookieDomainForRequest,
  setRefreshCookie,
} from "./auth-cookie.util";

function mockRequest(headers: Record<string, string | undefined>): Request {
  return { headers } as Request;
}

function mockResponse() {
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const cleared: Array<{ name: string; options: Record<string, unknown> }> = [];
  return {
    res: {
      cookie(name: string, value: string, options: Record<string, unknown>) {
        cookies.push({ name, value, options });
      },
      clearCookie(name: string, options: Record<string, unknown>) {
        cleared.push({ name, options });
      },
    } as never,
    cookies,
    cleared,
  };
}

describe("resolveCookieDomainForRequest", () => {
  const prev = process.env.COOKIE_DOMAIN;

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.COOKIE_DOMAIN = ".growvisi.in";
  });

  afterEach(() => {
    process.env.COOKIE_DOMAIN = prev;
  });

  it("uses Origin TLD for .com", () => {
    const req = mockRequest({ origin: "https://www.growvisi.com" });
    expect(resolveCookieDomainForRequest(req)).toBe(".growvisi.com");
  });

  it("uses Origin TLD for .in", () => {
    const req = mockRequest({ origin: "https://www.growvisi.in" });
    expect(resolveCookieDomainForRequest(req)).toBe(".growvisi.in");
  });

  it("falls back to COOKIE_DOMAIN env", () => {
    const req = mockRequest({});
    expect(resolveCookieDomainForRequest(req)).toBe(".growvisi.in");
  });
});

describe("setRefreshCookie / clearRefreshCookie", () => {
  const prev = process.env.COOKIE_DOMAIN;

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.COOKIE_DOMAIN = ".growvisi.in";
  });

  afterEach(() => {
    process.env.COOKIE_DOMAIN = prev;
  });

  it("sets cookie on request TLD", () => {
    const { res, cookies } = mockResponse();
    const req = mockRequest({ origin: "https://www.growvisi.com" });
    setRefreshCookie(res, "tok", req);
    expect(cookies[0]?.options.domain).toBe(".growvisi.com");
  });

  it("clears cookies for both product TLDs", () => {
    const { res, cleared } = mockResponse();
    const req = mockRequest({ origin: "https://www.growvisi.com" });
    clearRefreshCookie(res, req);
    const domains = cleared.map((c) => c.options.domain).sort();
    expect(domains).toEqual([".growvisi.com", ".growvisi.in"]);
  });
});
