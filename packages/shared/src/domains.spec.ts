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
    expect(parseGrowvisiHostname("www.growvisi.in")).toBe("in");
    expect(parseGrowvisiHostname("growvisi.in")).toBe("in");
    expect(parseGrowvisiHostname("api.growvisi.in")).toBe("in");
  });

  it("recognizes .com hosts", () => {
    expect(parseGrowvisiHostname("www.growvisi.com")).toBe("com");
    expect(parseGrowvisiHostname("growvisi.com")).toBe("com");
    expect(parseGrowvisiHostname("api.growvisi.com")).toBe("com");
  });

  it("returns null for unknown hosts", () => {
    expect(parseGrowvisiHostname("localhost")).toBeNull();
    expect(parseGrowvisiHostname("revenue-os-web.vercel.app")).toBeNull();
  });
});

describe("parseGrowvisiOrigin", () => {
  it("parses origin URLs", () => {
    expect(parseGrowvisiOrigin("https://www.growvisi.com/dashboard")).toBe("com");
    expect(parseGrowvisiOrigin("https://growvisi.in/login")).toBe("in");
  });
});

describe("resolveGrowvisiApiV1Url", () => {
  it("maps host to matching API origin", () => {
    expect(resolveGrowvisiApiV1Url("www.growvisi.com")).toBe("https://api.growvisi.com/api/v1");
    expect(resolveGrowvisiApiV1Url("www.growvisi.in")).toBe("https://api.growvisi.in/api/v1");
  });

  it("falls back to primary TLD", () => {
    expect(resolveGrowvisiApiV1Url("localhost")).toBe("https://api.growvisi.in/api/v1");
    expect(resolveGrowvisiTld("localhost")).toBe(GROWVISI_PRIMARY_TLD);
  });
});

describe("resolveGrowvisiCookieDomain", () => {
  it("returns per-TLD cookie domain", () => {
    expect(resolveGrowvisiCookieDomain("www.growvisi.com")).toBe(growvisiCookieDomain("com"));
    expect(resolveGrowvisiCookieDomain("www.growvisi.in")).toBe(growvisiCookieDomain("in"));
  });
});

describe("GROWVISI_CORS_ORIGINS", () => {
  it("includes both TLD apex and www", () => {
    expect(GROWVISI_CORS_ORIGINS).toMatch(/growvisi\.in/);
    expect(GROWVISI_CORS_ORIGINS).toMatch(/growvisi\.com/);
  });
});
