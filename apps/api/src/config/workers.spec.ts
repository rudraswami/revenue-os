import { getProcessRole, getQueueMode, useBackgroundWorkers } from "./workers";

describe("workers config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function clearWorkerEnv() {
    delete process.env.WORKER_ONLY;
    delete process.env.VERCEL;
    delete process.env.USE_INLINE_WORKERS;
    delete process.env.REDIS_URL;
  }

  it("enables processors on WORKER_ONLY host", () => {
    clearWorkerEnv();
    process.env.WORKER_ONLY = "1";
    expect(getProcessRole()).toBe("worker");
    expect(useBackgroundWorkers()).toBe(true);
  });

  it("disables processors on Vercel even with USE_INLINE_WORKERS=0", () => {
    clearWorkerEnv();
    process.env.VERCEL = "1";
    process.env.USE_INLINE_WORKERS = "0";
    process.env.REDIS_URL = "redis://localhost:6379";
    expect(useBackgroundWorkers()).toBe(false);
    expect(getQueueMode()).toBe("vercel-queue+waitUntil");
  });

  it("enables processors on dedicated host with REDIS_URL", () => {
    clearWorkerEnv();
    process.env.REDIS_URL = "redis://localhost:6379";
    expect(useBackgroundWorkers()).toBe(true);
    expect(getQueueMode()).toBe("background-workers");
  });

  it("forces inline when USE_INLINE_WORKERS=1", () => {
    clearWorkerEnv();
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.USE_INLINE_WORKERS = "1";
    expect(useBackgroundWorkers()).toBe(false);
  });
});
