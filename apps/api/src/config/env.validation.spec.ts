import "reflect-metadata";
import {
  isStrictProductionEnv,
  validateCookieDomain,
  validateCronSecret,
  validateEnv,
  validateProductionRedisUrl,
} from "./env.validation";

const BASE = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  DIRECT_URL: "postgresql://u:p@localhost:5432/db",
  JWT_SECRET: "x".repeat(32),
};

describe("isStrictProductionEnv", () => {
  it("is true for Vercel production only", () => {
    expect(
      isStrictProductionEnv({ VERCEL: "1", VERCEL_ENV: "production", NODE_ENV: "production" }),
    ).toBe(true);
    expect(
      isStrictProductionEnv({ VERCEL: "1", VERCEL_ENV: "preview", NODE_ENV: "production" }),
    ).toBe(false);
  });

  it("is true for self-hosted NODE_ENV=production", () => {
    expect(isStrictProductionEnv({ NODE_ENV: "production" })).toBe(true);
    expect(isStrictProductionEnv({ NODE_ENV: "development" })).toBe(false);
  });
});

describe("validateCookieDomain", () => {
  it("accepts leading-dot domain", () => {
    expect(validateCookieDomain(".growvisi.in")).toBe(".growvisi.in");
  });

  it("rejects missing domain", () => {
    expect(() => validateCookieDomain("")).toThrow(/COOKIE_DOMAIN is required/);
  });

  it("rejects domain without leading dot", () => {
    expect(() => validateCookieDomain("growvisi.in")).toThrow(/must start with/);
  });
});

describe("validateProductionRedisUrl", () => {
  it("accepts Upstash rediss URL", () => {
    expect(
      validateProductionRedisUrl("rediss://default:pass@endpoint.upstash.io:6379", true),
    ).toContain("rediss://");
  });

  it("rejects localhost", () => {
    expect(() => validateProductionRedisUrl("redis://127.0.0.1:6379", false)).toThrow(
      /localhost/,
    );
  });

  it("rejects empty", () => {
    expect(() => validateProductionRedisUrl("", true)).toThrow(/REDIS_URL is required/);
  });
});

describe("validateCronSecret", () => {
  it("accepts long secret", () => {
    expect(validateCronSecret("a".repeat(32))).toHaveLength(32);
  });

  it("rejects short secret", () => {
    expect(() => validateCronSecret("short")).toThrow(/at least 16/);
  });

  it("rejects missing", () => {
    expect(() => validateCronSecret("")).toThrow(/CRON_SECRET is required/);
  });
});

describe("validateEnv production gate", () => {
  const prodVercel = {
    ...BASE,
    VERCEL: "1",
    VERCEL_ENV: "production",
    NODE_ENV: "production",
    WHATSAPP_VERIFY_TOKEN: "verify",
    META_APP_SECRET: "meta-secret",
    REDIS_URL: "rediss://default:pass@endpoint.upstash.io:6379",
    CRON_SECRET: "c".repeat(32),
    COOKIE_DOMAIN: ".growvisi.in",
  };

  it("passes with full production infra", () => {
    expect(() => validateEnv(prodVercel)).not.toThrow();
  });

  it("fails without REDIS_URL", () => {
    expect(() => validateEnv({ ...prodVercel, REDIS_URL: "" })).toThrow(/REDIS_URL/);
  });

  it("fails without CRON_SECRET", () => {
    expect(() => validateEnv({ ...prodVercel, CRON_SECRET: "" })).toThrow(/CRON_SECRET/);
  });

  it("fails without COOKIE_DOMAIN", () => {
    expect(() => validateEnv({ ...prodVercel, COOKIE_DOMAIN: "" })).toThrow(/COOKIE_DOMAIN/);
  });

  it("skips infra requirements on Vercel preview", () => {
    expect(() =>
      validateEnv({
        ...BASE,
        VERCEL: "1",
        VERCEL_ENV: "preview",
        NODE_ENV: "production",
      }),
    ).not.toThrow();
  });

  it("skips infra requirements in development", () => {
    expect(() => validateEnv({ ...BASE, NODE_ENV: "development" })).not.toThrow();
  });
});
