import { ForbiddenException, Injectable } from "@nestjs/common";
import type { ApiKeyAuthContext } from "../../common/decorators/api-key-auth.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ExternalApiService {
  constructor(private readonly prisma: PrismaService) {}

  private assertScope(auth: ApiKeyAuthContext, scope: string) {
    if (!auth.scopes.includes(scope) && !auth.scopes.includes("read")) {
      throw new ForbiddenException(`API key missing scope: ${scope}`);
    }
  }

  async listLeads(auth: ApiKeyAuthContext, page = 1, pageSize = 50) {
    this.assertScope(auth, "read:leads");
    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where: { organizationId: auth.organizationId },
        orderBy: { updatedAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          phone: true,
          displayName: true,
          stage: true,
          score: true,
          source: true,
          valueCents: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.lead.count({ where: { organizationId: auth.organizationId } }),
    ]);

    return {
      data,
      page,
      pageSize: take,
      total,
      hasMore: skip + data.length < total,
    };
  }

  async listConversations(auth: ApiKeyAuthContext, page = 1, pageSize = 50) {
    this.assertScope(auth, "read:conversations");
    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { organizationId: auth.organizationId },
        orderBy: { lastMessageAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          contactPhone: true,
          contactName: true,
          status: true,
          unreadCount: true,
          lastMessageAt: true,
          assignedToId: true,
          leadId: true,
          createdAt: true,
        },
      }),
      this.prisma.conversation.count({ where: { organizationId: auth.organizationId } }),
    ]);

    return {
      data,
      page,
      pageSize: take,
      total,
      hasMore: skip + data.length < total,
    };
  }
}
