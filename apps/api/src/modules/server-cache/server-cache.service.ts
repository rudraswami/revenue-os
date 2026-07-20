import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { withTimeout } from "../../common/utils/with-timeout";
import {
  entitlementsCacheKey,
  membershipCacheKey,
  onboardingCacheKey,
  queueStatsCacheKey,
  SERVER_CACHE_TTL,
  shellBootstrapVersionKey,
} from "./server-cache.keys";
import { createEmptyCacheMetrics, type ServerCacheMetrics } from "./server-cache.metrics";

export type CachedMembership = {
  role: string;
  userStatus: string;
};

const REDIS_OP_TIMEOUT_MS = 150;
const DEL_RETRY_ATTEMPTS = 2;

@Injectable()
export class ServerCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(ServerCacheService.name);
  private readonly client: Redis | null;
  private readonly enabled: boolean;
  private readonly metrics = createEmptyCacheMetrics();

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>("REDIS_URL")?.trim();
    if (!url) {
      this.client = null;
      this.enabled = false;
      return;
    }

    this.client = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3_000,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 200, 2_000),
    });
    this.enabled = true;
    this.client.on("error", (err) => {
      this.metrics.errors += 1;
      this.logger.warn(`Redis cache error: ${err.message}`);
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getMetrics(): Readonly<ServerCacheMetrics> {
    return { ...this.metrics };
  }

  async get<T>(key: string): Promise<T | null> {
    const { value } = await this.getWithMeta<T>(key);
    return value;
  }

  async getWithMeta<T>(key: string): Promise<{ value: T | null; hit: boolean }> {
    if (!this.client) {
      this.metrics.misses += 1;
      return { value: null, hit: false };
    }
    try {
      const raw = await withTimeout(
        this.client.get(key),
        REDIS_OP_TIMEOUT_MS,
        "Redis cache get timed out",
      );
      if (!raw) {
        this.metrics.misses += 1;
        return { value: null, hit: false };
      }
      this.metrics.hits += 1;
      return { value: JSON.parse(raw) as T, hit: true };
    } catch (err) {
      this.recordFailure(err);
      this.metrics.misses += 1;
      return { value: null, hit: false };
    }
  }

  async set(key: string, value: unknown, ttlSec: number): Promise<void> {
    if (!this.client || ttlSec <= 0) return;
    try {
      const payload = JSON.stringify(value);
      await withTimeout(
        this.client.set(key, payload, "EX", ttlSec),
        REDIS_OP_TIMEOUT_MS,
        "Redis cache set timed out",
      );
      this.metrics.sets += 1;
    } catch (err) {
      this.recordFailure(err);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || keys.length === 0) return;
    this.metrics.invalidations += keys.length;

    for (let attempt = 1; attempt <= DEL_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const removed = await withTimeout(
          this.client.del(...keys),
          REDIS_OP_TIMEOUT_MS,
          "Redis cache del timed out",
        );
        this.metrics.dels += removed;
        return;
      } catch (err) {
        if (attempt === DEL_RETRY_ATTEMPTS) {
          this.metrics.invalidationFailures += keys.length;
          this.logger.warn(
            `Cache invalidation failed for ${keys.length} key(s) after ${DEL_RETRY_ATTEMPTS} attempts: ${(err as Error).message}`,
          );
        }
        this.recordFailure(err);
      }
    }
  }

  async invalidateMembership(userId: string, organizationId: string): Promise<void> {
    await this.del(membershipCacheKey(userId, organizationId));
  }

  async invalidateEntitlements(organizationId: string): Promise<void> {
    await this.del(entitlementsCacheKey(organizationId));
  }

  /** Bump org-wide version so all per-user shell-bootstrap entries miss on read. */
  async invalidateShellBootstrap(organizationId: string): Promise<void> {
    await Promise.all([
      this.set(
        shellBootstrapVersionKey(organizationId),
        Date.now(),
        SERVER_CACHE_TTL.shellBootstrapVersionSec,
      ),
      this.del(onboardingCacheKey(organizationId)),
    ]);
    this.metrics.invalidations += 1;
  }

  async invalidateQueueStats(organizationId: string, userId: string): Promise<void> {
    await this.del(queueStatsCacheKey(organizationId, userId));
  }

  async invalidateOnboarding(organizationId: string): Promise<void> {
    await this.del(onboardingCacheKey(organizationId));
  }

  async getShellBootstrapVersion(organizationId: string): Promise<number> {
    return (await this.get<number>(shellBootstrapVersionKey(organizationId))) ?? 0;
  }

  private recordFailure(err: unknown): void {
    const message = (err as Error).message ?? String(err);
    if (message.includes("timed out")) {
      this.metrics.timeouts += 1;
    } else {
      this.metrics.errors += 1;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
