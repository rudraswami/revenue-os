import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import type { JwtPayload } from "@growvisi/shared";
import type { ApiKeyAuthContext } from "../../common/decorators/api-key-auth.decorator";
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
        scopes: ["read:leads", "read:conversations"],
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

  async authenticate(rawKey: string): Promise<ApiKeyAuthContext> {
    if (!rawKey.startsWith("gv_")) {
      throw new UnauthorizedException("Invalid API key format.");
    }

    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const record = await this.prisma.apiKey.findFirst({
      where: { keyHash, revokedAt: null },
      select: {
        id: true,
        organizationId: true,
        scopes: true,
        expiresAt: true,
      },
    });

    if (!record) {
      throw new UnauthorizedException("Invalid or revoked API key.");
    }
    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("API key has expired.");
    }

    await this.assertProPlan(record.organizationId);

    void this.prisma.apiKey
      .update({
        where: { id: record.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => undefined);

    return {
      organizationId: record.organizationId,
      apiKeyId: record.id,
      scopes: record.scopes,
    };
  }

  private async assertProPlan(organizationId: string) {
    const access = await this.entitlements.getAccess(organizationId);
    if (access.planId !== "pro" || !access.hasAccess) {
      throw new ForbiddenException("API keys are available on the Pro plan.");
    }
  }
}
