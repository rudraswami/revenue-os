import type { Response } from "express";
import {
  setHealthCacheControl,
  setPrivateNoStore,
  setRedisCacheStatus,
} from "./cache-headers";

function mockResponse() {
  const headers = new Map<string, string>();
  return {
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
  } as unknown as Response;
}

describe("cache-headers (P2)", () => {
  it("setPrivateNoStore sets private, no-store", () => {
    const res = mockResponse();
    setPrivateNoStore(res);
    expect(res.getHeader("Cache-Control")).toBe("private, no-store");
  });

  it("setHealthCacheControl sets no-cache", () => {
    const res = mockResponse();
    setHealthCacheControl(res);
    expect(res.getHeader("Cache-Control")).toBe("no-cache");
  });

  it("setRedisCacheStatus sets X-Growvisi-Cache and private no-store", () => {
    const res = mockResponse();
    setRedisCacheStatus(res, true);
    expect(res.getHeader("X-Growvisi-Cache")).toBe("redis-hit");
    expect(res.getHeader("Cache-Control")).toBe("private, no-store");

    const miss = mockResponse();
    setRedisCacheStatus(miss, false);
    expect(miss.getHeader("X-Growvisi-Cache")).toBe("redis-miss");
  });
});
