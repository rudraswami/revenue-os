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

  it("returns after persist without awaiting processInline when workers disabled", async () => {
    (useBackgroundWorkers as jest.Mock).mockReturnValue(false);

    const service = makeService();
    let processStarted = false;
    jest.spyOn(service as any, "processInline").mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          processStarted = true;
          setTimeout(resolve, 50);
        }),
    );

    const result = await service.ingestWebhook(payload);

    expect(result).toEqual({ received: true, eventId: "evt_1" });
    expect(deferBackgroundTask).toHaveBeenCalledTimes(1);
    expect(processStarted).toBe(false);
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
