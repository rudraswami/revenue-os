import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SkipThrottle } from "@nestjs/throttler";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { useBackgroundWorkers } from "../../config/workers";

@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;

    const workersEnabled = useBackgroundWorkers();
    let redis: "ok" | "skipped" | "error" = workersEnabled ? "error" : "skipped";

    if (workersEnabled) {
      const url = this.config.get<string>("REDIS_URL")?.trim();
      if (!url) {
        redis = "error";
      } else {
        const client = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 3_000 });
        try {
          const pong = await client.ping();
          redis = pong === "PONG" ? "ok" : "error";
        } catch {
          redis = "error";
        } finally {
          client.disconnect();
        }
      }
    }

    const status = redis === "error" ? "degraded" : "ok";

    return {
      status,
      service: "growvisi-api",
      timestamp: new Date().toISOString(),
      checks: {
        database: "ok",
        redis,
        workers: workersEnabled ? "enabled" : "inline",
      },
    };
  }
}
