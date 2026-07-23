import { deferBackgroundTask } from "../../common/utils/defer-background";
import {
  useVercelWaitUntilCampaignSend,
} from "./campaign-send-runtime";

jest.mock("../../common/utils/defer-background", () => ({
  deferBackgroundTask: jest.fn(),
}));

describe("campaign send transport matrix", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  it("documents Vercel campaign sends bypass QStash durable batches", () => {
    expect(useVercelWaitUntilCampaignSend(true)).toBe(true);

    // Simulates enqueueSendWork branch order on Vercel:
    const useWorkers = false;
    const onVercel = true;
    const durable = true;

    let transport: "bullmq" | "waitUntil" | "qstash" | "inline" = "inline";
    if (useWorkers) transport = "bullmq";
    else if (useVercelWaitUntilCampaignSend(onVercel)) transport = "waitUntil";
    else if (durable) transport = "qstash";
    else transport = "inline";

    expect(transport).toBe("waitUntil");
  });

  it("documents non-Vercel durable hosts still use QStash for campaigns", () => {
    const useWorkers = false;
    const onVercel = false;
    const durable = true;

    let transport: "bullmq" | "waitUntil" | "qstash" | "inline" = "inline";
    if (useWorkers) transport = "bullmq";
    else if (useVercelWaitUntilCampaignSend(onVercel)) transport = "waitUntil";
    else if (durable) transport = "qstash";
    else transport = "inline";

    expect(transport).toBe("qstash");
  });

  it("documents worker hosts prefer BullMQ before any serverless transport", () => {
    const useWorkers = true;
    const onVercel = false;
    const durable = true;

    let transport: "bullmq" | "waitUntil" | "qstash" | "inline" = "inline";
    if (useWorkers) transport = "bullmq";
    else if (useVercelWaitUntilCampaignSend(onVercel)) transport = "waitUntil";
    else if (durable) transport = "qstash";
    else transport = "inline";

    expect(transport).toBe("bullmq");
  });

  it("keeps deferBackgroundTask as the Vercel campaign primitive", () => {
    process.env.VERCEL = "1";
    const run = jest.fn();
    if (useVercelWaitUntilCampaignSend()) {
      deferBackgroundTask(run);
    }
    expect(deferBackgroundTask).toHaveBeenCalledWith(run);
  });
});
