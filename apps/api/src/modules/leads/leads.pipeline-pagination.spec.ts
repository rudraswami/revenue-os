import type { JwtPayload } from "@growvisi/shared";
import { LeadsService } from "./leads.service";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../billing/entitlements.service";
import { WebhookDispatchService } from "../webhooks/webhook-dispatch.service";
import { AuditService } from "../audit/audit.service";
import { AutomationsService } from "../automations/automations.service";

describe("LeadsService.listByStage pagination (P1)", () => {
  const user = {
    sub: "user_1",
    organizationId: "org_1",
    role: "OWNER",
  } as JwtPayload;

  const findMany = jest.fn();
  const prisma = {
    lead: { findMany },
    leadStageHistory: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
  } as unknown as PrismaService;

  const automations = {
    getRunsToday: jest.fn().mockResolvedValue(0),
  } as unknown as AutomationsService;

  const service = new LeadsService(
    prisma,
    {} as EntitlementsService,
    {} as WebhookDispatchService,
    {} as AuditService,
    automations,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([]);
  });

  it("queries each pipeline stage with take = perStageLimit + 1", async () => {
    await service.listByStage(user, undefined, 25);

    expect(findMany).toHaveBeenCalledTimes(7);
    for (const call of findMany.mock.calls) {
      expect(call[0]).toEqual(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: "org_1" }),
          take: 26,
          orderBy: { updatedAt: "desc" },
        }),
      );
    }
  });

  it("applies SQL filter for hot leads", async () => {
    await service.listByStage(user, "hot", 40);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          score: { gte: 80 },
        }),
      }),
    );
  });

  it("uses stale id list instead of loading all leads", async () => {
    const staleSpy = jest
      .spyOn(service, "listStaleLeadIds")
      .mockResolvedValue(["lead_a", "lead_b"]);

    await service.listByStage(user, "stale", 40);

    expect(staleSpy).toHaveBeenCalledWith("org_1");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
          id: { in: ["lead_a", "lead_b"] },
        }),
      }),
    );

    staleSpy.mockRestore();
  });
});
