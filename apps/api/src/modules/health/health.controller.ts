import { Controller, Get, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";
import Redis from "ioredis";
import { setHealthCacheControl } from "../../common/http/cache-headers";
import { getProcessRole, getQueueMode, useBackgroundWorkers } from "../../config/workers";
import { PrismaService } from "../prisma/prisma.service";
import { JobsService } from "../jobs/jobs.service";
import { ServerCacheService } from "../server-cache/server-cache.service";
import { QueueHealthService } from "./queue-health.service";

@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly serverCache: ServerCacheService,
    private readonly queueHealth: QueueHealthService,
    private readonly jobs: JobsService,
  ) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    setHealthCacheControl(res);
    await this.prisma.$queryRaw`SELECT 1`;

    const redisUrl = this.config.get<string>("REDIS_URL")?.trim();
    const workersEnabled = useBackgroundWorkers();
    const onVercel = process.env.VERCEL === "1";

    let redis: "ok" | "missing" | "error" = "missing";

    if (redisUrl) {
      const client = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 3_000 });
      try {
        const pong = await client.ping();
        redis = pong === "PONG" ? "ok" : "error";
      } catch {
        redis = "error";
      } finally {
        client.disconnect();
      }
    }

    const queueMode = getQueueMode();

    const status =
      redis === "error" || (onVercel && redis === "missing") ? "degraded" : "ok";

    return {
      status,
      service: process.env.WORKER_ONLY === "1" ? "growvisi-worker" : "growvisi-api",
      processRole: getProcessRole(),
      timestamp: new Date().toISOString(),
      checks: {
        database: "ok",
        redis,
        queueMode,
        durableJobs: this.jobs.durable,
        workersEnabled,
        cookieDomain: Boolean(this.config.get<string>("COOKIE_DOMAIN")?.trim()),
        cronConfigured: Boolean(this.config.get<string>("CRON_SECRET")?.trim()),
        serverCache: {
          enabled: this.serverCache.isEnabled(),
          ...this.serverCache.getMetrics(),
        },
      },
    };
  }

  @Get("queues")
  async queues(@Res({ passthrough: true }) res: Response) {
    setHealthCacheControl(res);
    const counts = await this.queueHealth.getJobCounts();
    return {
      processRole: getProcessRole(),
      queueMode: getQueueMode(),
      workersEnabled: useBackgroundWorkers(),
      queues: counts,
      note:
        counts == null
          ? "Processors not registered on this process — run WORKER_ONLY=1 worker host for BullMQ consumers."
          : undefined,
    };
  }
}
