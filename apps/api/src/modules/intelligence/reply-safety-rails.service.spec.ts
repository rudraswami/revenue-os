import { ReplySafetyRailsService } from "./reply-safety-rails.service";

describe("ReplySafetyRailsService", () => {
  const prisma = {
    message: {
      count: jest.fn(),
    },
  };
  const service = new ReplySafetyRailsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows when under velocity cap", async () => {
    prisma.message.count.mockResolvedValue(2);
    const result = await service.checkVelocity({
      organizationId: "org",
      conversationId: "conv",
    });
    expect(result.blocked).toBe(false);
  });

  it("blocks when velocity cap exceeded", async () => {
    prisma.message.count.mockResolvedValue(5);
    const result = await service.checkVelocity({
      organizationId: "org",
      conversationId: "conv",
    });
    expect(result.blocked).toBe(true);
    expect(result.code).toBe("safety_velocity");
  });
});
