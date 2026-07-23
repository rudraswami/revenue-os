import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GROWVISI_CORS_ORIGINS,
  GROWVISI_PRIMARY_TLD,
  growvisiCookieDomain,
  parseGrowvisiHostname,
  parseGrowvisiOrigin,
  resolveGrowvisiApiV1Url,
  resolveGrowvisiCookieDomain,
  resolveGrowvisiTld,
} from "./domains";

describe("parseGrowvisiHostname", () => {
  it("recognizes .in hosts", () => {
    assert.equal(parseGrowvisiHostname("www.growvisi.in"), "in");
    assert.equal(parseGrowvisiHostname("growvisi.in"), "in");
    assert.equal(parseGrowvisiHostname("api.growvisi.in"), "in");
  });

  it("recognizes .com hosts", () => {
    assert.equal(parseGrowvisiHostname("www.growvisi.com"), "com");
    assert.equal(parseGrowvisiHostname("growvisi.com"), "com");
    assert.equal(parseGrowvisiHostname("api.growvisi.com"), "com");
  });

  it("returns null for unknown hosts", () => {
    assert.equal(parseGrowvisiHostname("localhost"), null);
    assert.equal(parseGrowvisiHostname("revenue-os-web.vercel.app"), null);
  });
});

describe("parseGrowvisiOrigin", () => {
  it("parses origin URLs", () => {
    assert.equal(parseGrowvisiOrigin("https://www.growvisi.com/dashboard"), "com");
    assert.equal(parseGrowvisiOrigin("https://growvisi.in/login"), "in");
  });
});

describe("resolveGrowvisiApiV1Url", () => {
  it("maps host to matching API origin", () => {
    assert.equal(resolveGrowvisiApiV1Url("www.growvisi.com"), "https://api.growvisi.com/api/v1");
    assert.equal(resolveGrowvisiApiV1Url("www.growvisi.in"), "https://api.growvisi.in/api/v1");
  });

  it("falls back to primary TLD", () => {
    assert.equal(resolveGrowvisiApiV1Url("localhost"), "https://api.growvisi.in/api/v1");
    assert.equal(resolveGrowvisiTld("localhost"), GROWVISI_PRIMARY_TLD);
  });
});

describe("resolveGrowvisiCookieDomain", () => {
  it("returns per-TLD cookie domain", () => {
    assert.equal(resolveGrowvisiCookieDomain("www.growvisi.com"), growvisiCookieDomain("com"));
    assert.equal(resolveGrowvisiCookieDomain("www.growvisi.in"), growvisiCookieDomain("in"));
  });
});

describe("GROWVISI_CORS_ORIGINS", () => {
  it("includes both TLD apex and www", () => {
    assert.match(GROWVISI_CORS_ORIGINS, /growvisi\.in/);
    assert.match(GROWVISI_CORS_ORIGINS, /growvisi\.com/);
  });
});
