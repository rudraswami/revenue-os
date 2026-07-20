import { EntitlementsService } from "./entitlements.service";
import { PrismaService } from "../prisma/prisma.service";
import { ServerCacheService } from "../server-cache/server-cache.service";

describe("EntitlementsService lead cap signals", () => {
  const prisma = {
    organization: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const cache = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  } as unknown as ServerCacheService;

  const service = new EntitlementsService(prisma, cache);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("increments skipped lead counter for the current month", async () => {
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      settings: { leadCap: { monthKey, skippedThisMonth: 2 } },
    });
    (prisma.organization.update as jest.Mock).mockResolvedValue({});

    await service.recordLeadIngestionSkipped("org_1");

    expect(prisma.organization.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "org_1" },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            leadCap: expect.objectContaining({ skippedThisMonth: 3 }),
          }),
        }),
      }),
    );
  });

  it("returns skipped count only for current month", async () => {
    const now = new Date();
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    (prisma.organization.findUnique as jest.Mock).mockResolvedValue({
      settings: { leadCap: { monthKey, skippedThisMonth: 4 } },
    });

    const signal = await service.leadCapIngestionSignal("org_1");
    expect(signal.skippedThisMonth).toBe(4);
  });
});
