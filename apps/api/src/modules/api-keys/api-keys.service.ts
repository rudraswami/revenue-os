import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import type { JwtPayload } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../billing/entitlements.service";

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async list(user: JwtPayload) {
    await this.assertProPlan(user.organizationId);
    return this.prisma.apiKey.findMany({
      where: { organizationId: user.organizationId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async create(user: JwtPayload, name: string) {
    await this.assertProPlan(user.organizationId);
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      throw new ForbiddenException("Only owners and admins can create API keys.");
    }

    const raw = `gv_${randomBytes(24).toString("hex")}`;
    const keyHash = createHash("sha256").update(raw).digest("hex");
    const keyPrefix = raw.slice(0, 12);

    const record = await this.prisma.apiKey.create({
      data: {
        organizationId: user.organizationId,
        name: name.trim() || "API key",
        keyPrefix,
        keyHash,
        scopes: ["read"],
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        createdAt: true,
      },
    });

    return { ...record, secret: raw };
  }

  async revoke(user: JwtPayload, id: string) {
    await this.assertProPlan(user.organizationId);
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      throw new ForbiddenException("Only owners and admins can revoke API keys.");
    }

    const key = await this.prisma.apiKey.findFirst({
      where: { id, organizationId: user.organizationId, revokedAt: null },
    });
    if (!key) throw new NotFoundException("API key not found.");

    await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  private async assertProPlan(organizationId: string) {
    const access = await this.entitlements.getAccess(organizationId);
    if (access.planId !== "pro" || !access.hasAccess) {
      throw new ForbiddenException("API keys are available on the Pro plan.");
    }
  }
}
