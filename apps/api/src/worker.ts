import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { initSentry } from "./config/sentry";
import { getProcessRole } from "./config/workers";

/**
 * Long-lived BullMQ worker process — no HTTP listener.
 * Run with WORKER_ONLY=1 USE_INLINE_WORKERS=0 REDIS_URL=...
 */
async function bootstrap(): Promise<void> {
  initSentry();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });

  const shutdown = async (signal: string) => {
    console.log(`Growvisi worker shutting down (${signal})`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  console.log(
    `Growvisi background worker started (role=${getProcessRole()}, BullMQ processors active)`,
  );
}

bootstrap().catch((err) => {
  console.error("[worker] Failed to start:", err);
  process.exit(1);
});
