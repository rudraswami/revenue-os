import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { WhatsappService, type WhatsappWebhookPayload } from "./whatsapp.service";
import { deferBackgroundTask } from "../../common/utils/defer-background";

jest.mock("../../config/workers", () => ({
  useBackgroundWorkers: jest.fn(() => false),
}));

jest.mock("../../common/utils/defer-background", () => ({
  deferBackgroundTask: jest.fn((task: () => Promise<unknown>) => {
    void task().catch(() => {});
  }),
}));

describe("WhatsappService webhook landing (P0-5)", () => {
  const prisma = {
    webhookEvent: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const inboundQueue = { add: jest.fn() };

  const jobs = {
    enqueue: jest.fn((_type: string, _payload: unknown, runInline: () => Promise<void>) => {
      deferBackgroundTask(runInline);
    }),
  };

  const payload: WhatsappWebhookPayload = {
    object: "whatsapp_business_account",
    entry: [],
  };

  const makeService = () =>
    new WhatsappService(
      prisma as never,
      { get: jest.fn() } as never,
      inboundQueue as never,
      jobs as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.webhookEvent.create.mockResolvedValue({ id: "evt_land" });
    prisma.webhookEvent.update.mockResolvedValue({});
  });

  it("runs persist + classify INLINE within the webhook request (no deferred tasks)", async () => {
    const service = makeService();
    let classifyRan = false;
    jest.spyOn(service as any, "enqueueClassificationForEvents").mockImplementation(
      async () => { classifyRan = true; },
    );

    const ack = await service.ingestWebhook(payload);

    expect(ack).toEqual({ received: true, eventId: "evt_land" });
    // Message persistence is committed synchronously.
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt_land" },
        data: expect.objectContaining({ processedAt: expect.any(Date) }),
      }),
    );
    // Classify ran inline (awaited) — NOT deferred via waitUntil/QStash.
    expect(classifyRan).toBe(true);
    // No deferBackgroundTask calls on this path.
    expect(deferBackgroundTask).not.toHaveBeenCalled();
  });

  it("records processing errors on webhookEvent without failing ACK", async () => {
    const service = makeService();
    jest.spyOn(service, "processWebhookPayload").mockRejectedValue(new Error("pipeline failed"));

    const ack = await service.ingestWebhook(payload);
    expect(ack.received).toBe(true);

    await new Promise((r) => setTimeout(r, 50));
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt_land" },
        data: expect.objectContaining({ error: "pipeline failed" }),
      }),
    );
  });
});
