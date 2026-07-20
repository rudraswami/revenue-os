import { ConfigService } from "@nestjs/config";
import { ServerCacheService } from "./server-cache.service";

const mockClient = {
  on: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  quit: jest.fn(),
};

jest.mock("ioredis", () => ({
  __esModule: true,
  default: jest.fn(() => mockClient),
}));

describe("ServerCacheService resilience (P0-4 soak)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.get.mockResolvedValue(null);
    mockClient.del.mockResolvedValue(1);
  });

  const makeService = (redisUrl?: string) => {
    const config = {
      get: jest.fn((key: string) => (key === "REDIS_URL" ? redisUrl : undefined)),
    } as unknown as ConfigService;
    return new ServerCacheService(config);
  };

  it("disables cache when REDIS_URL unset — get returns null (DB fallback path)", async () => {
    const service = makeService(undefined);
    expect(service.isEnabled()).toBe(false);
    await expect(service.get("gv:entitlements:org_1")).resolves.toBeNull();
    expect(service.getMetrics().misses).toBeGreaterThanOrEqual(1);
  });

  it("increments timeouts on Redis get hang without throwing", async () => {
    mockClient.get.mockImplementation(() => new Promise(() => {}));
    const service = makeService("redis://127.0.0.1:6379");
    const value = await service.get("gv:membership:u1:org1");
    expect(value).toBeNull();
    expect(service.getMetrics().timeouts).toBeGreaterThanOrEqual(1);
  }, 10_000);

  it("invalidateEntitlements retries del on failure", async () => {
    mockClient.del
      .mockRejectedValueOnce(new Error("connection reset"))
      .mockResolvedValueOnce(1);
    const service = makeService("redis://127.0.0.1:6379");
    await service.invalidateEntitlements("org_retry");
    expect(mockClient.del).toHaveBeenCalledTimes(2);
  });

  it("invalidateShellBootstrap bumps version key", async () => {
    mockClient.set.mockResolvedValue("OK");
    const service = makeService("redis://127.0.0.1:6379");
    await service.invalidateShellBootstrap("org_shell");
    expect(mockClient.set).toHaveBeenCalledWith(
      "gv:shell-bootstrap-ver:org_shell",
      expect.any(String),
      "EX",
      3600,
    );
  });
});
