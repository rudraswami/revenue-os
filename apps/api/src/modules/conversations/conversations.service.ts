import { Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload } from "@revenue-os/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: JwtPayload, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { lastMessageAt: "desc" },
        skip,
        take: pageSize,
        include: {
          lead: { select: { id: true, stage: true, score: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      this.prisma.conversation.count({
        where: { organizationId: user.organizationId },
      }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      hasMore: skip + data.length < total,
    };
  }

  async getById(user: JwtPayload, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        lead: true,
        messages: { orderBy: { createdAt: "asc" }, take: 100 },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    if (!conversation) throw new NotFoundException("Conversation not found");
    return conversation;
  }

  async assign(user: JwtPayload, id: string, assignToUserId: string | null) {
    const conversation = await this.prisma.conversation.updateMany({
      where: { id, organizationId: user.organizationId },
      data: {
        assignedToId: assignToUserId,
        aiEnabled: assignToUserId ? false : undefined,
      },
    });
    if (conversation.count === 0) throw new NotFoundException();
    return this.getById(user, id);
  }

  async toggleAi(user: JwtPayload, id: string, aiEnabled: boolean) {
    await this.prisma.conversation.updateMany({
      where: { id, organizationId: user.organizationId },
      data: { aiEnabled },
    });
    return this.getById(user, id);
  }
}
