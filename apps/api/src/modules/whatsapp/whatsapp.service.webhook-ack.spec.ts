import { WhatsappService, type WhatsappWebhookPayload } from "./whatsapp.service";
import { useBackgroundWorkers } from "../../config/workers";
import { deferBackgroundTask } from "../../common/utils/defer-background";
import { WEBHOOK_ACK_ENQUEUE_TIMEOUT_MS } from "../../config/webhook-ack";

jest.mock("../../config/workers", () => ({
  useBackgroundWorkers: jest.fn(),
}));

jest.mock("../../common/utils/defer-background", () => ({
  deferBackgroundTask: jest.fn(),
}));

describe("WhatsappService webhook ACK (P0-5)", () => {
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
    );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.webhookEvent.create.mockResolvedValue({ id: "evt_1" });
    inboundQueue.add.mockResolvedValue({ id: "job_1" });
  });

  it("persists synchronously before ACK on serverless, without deferring the whole pipeline", async () => {
    (useBackgroundWorkers as jest.Mock).mockReturnValue(false);

    const service = makeService();
    // processInline is the deferred/durable path — it must NOT be used on the
    // serverless request path anymore (persistence is synchronous instead).
    const processInlineSpy = jest
      .spyOn(service as any, "processInline")
      .mockResolvedValue(undefined);

    const result = await service.ingestWebhook(payload);

    expect(result).toEqual({ received: true, eventId: "evt_1" });
    // Synchronous persist marks the event processed inside the request.
    expect(prisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "evt_1" },
        data: expect.objectContaining({ processedAt: expect.any(Date) }),
      }),
    );
    // Happy path: no deferral, no processInline hand-off.
    expect(deferBackgroundTask).not.toHaveBeenCalled();
    expect(processInlineSpy).not.toHaveBeenCalled();
  });

  it("enqueues with bounded timeout when workers enabled", async () => {
    (useBackgroundWorkers as jest.Mock).mockReturnValue(true);

    const service = makeService();
    await service.ingestWebhook(payload);

    expect(inboundQueue.add).toHaveBeenCalledWith(
      "process",
      { webhookEventId: "evt_1", payload },
      expect.objectContaining({ jobId: expect.any(String) }),
    );
    expect(deferBackgroundTask).not.toHaveBeenCalled();
  });

  it("uses WEBHOOK_ACK_ENQUEUE_TIMEOUT_MS for enqueue budget", () => {
    expect(WEBHOOK_ACK_ENQUEUE_TIMEOUT_MS).toBe(200);
  });

  it("defers inline when enqueue fails on worker host", async () => {
    (useBackgroundWorkers as jest.Mock).mockReturnValue(true);
    inboundQueue.add.mockRejectedValue(new Error("redis down"));

    const service = makeService();
    jest.spyOn(service as any, "processInline").mockResolvedValue(undefined);

    await service.ingestWebhook(payload);
    await new Promise((resolve) => setImmediate(resolve));

    expect(deferBackgroundTask).toHaveBeenCalledTimes(1);
  });
});
