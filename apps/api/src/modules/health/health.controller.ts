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

    const queueMode = workersEnabled
      ? "background-workers"
      : onVercel
        ? "vercel-queue+waitUntil"
        : redisUrl
          ? "inline+queue"
          : "inline-only";

    const status =
      redis === "error" || (onVercel && redis === "missing") ? "degraded" : "ok";

    return {
      status,
      service: "growvisi-api",
      timestamp: new Date().toISOString(),
      checks: {
        database: "ok",
        redis,
        queueMode,
        cookieDomain: Boolean(this.config.get<string>("COOKIE_DOMAIN")?.trim()),
        cronConfigured: Boolean(this.config.get<string>("CRON_SECRET")?.trim()),
      },
    };
  }
}
