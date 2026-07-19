import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const RETENTION_DAYS = 90;

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async purgeOldOperationalData() {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const [webhookEvents, aiRuns] = await Promise.all([
      this.prisma.webhookEvent.deleteMany({
        where: {
          processedAt: { not: null },
          createdAt: { lt: cutoff },
        },
      }),
      this.prisma.aiRun.deleteMany({
        where: {
          status: { in: ["COMPLETED", "FAILED"] },
          createdAt: { lt: cutoff },
        },
      }),
    ]);

    this.logger.log(
      `Retention purge: ${webhookEvents.count} webhook events, ${aiRuns.count} ai runs older than ${RETENTION_DAYS}d`,
    );

    return {
      retentionDays: RETENTION_DAYS,
      webhookEventsDeleted: webhookEvents.count,
      aiRunsDeleted: aiRuns.count,
      cutoff: cutoff.toISOString(),
    };
  }
}
