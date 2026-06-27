import { Injectable, Logger } from "@nestjs/common";
import type { AuditAction } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  log(params: {
    organizationId: string;
    userId?: string | null;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }) {
    void this.prisma.auditLog
      .create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId ?? null,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          metadata: (params.metadata ?? {}) as object,
        },
      })
      .catch((err) => {
        this.logger.warn(`Audit log failed: ${err instanceof Error ? err.message : "unknown"}`);
      });
  }

  async listForOrganization(organizationId: string, limit: number) {
    const rows = await this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      resource: row.resource,
      resourceId: row.resourceId,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      user: row.user
        ? { id: row.user.id, name: row.user.name, email: row.user.email }
        : null,
    }));
  }
}
