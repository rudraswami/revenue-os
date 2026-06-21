import { Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: JwtPayload) {
    return this.prisma.knowledgeDocument.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        sourceType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        rawContent: true,
      },
    });
  }

  async create(user: JwtPayload, title: string, content: string) {
    return this.prisma.knowledgeDocument.create({
      data: {
        organizationId: user.organizationId,
        title: title.trim(),
        rawContent: content.trim(),
        sourceType: "manual",
        status: "active",
      },
      select: {
        id: true,
        title: true,
        sourceType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        rawContent: true,
      },
    });
  }

  async update(
    user: JwtPayload,
    id: string,
    patch: { title?: string; content?: string },
  ) {
    const existing = await this.prisma.knowledgeDocument.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException("Document not found");

    return this.prisma.knowledgeDocument.update({
      where: { id },
      data: {
        title: patch.title?.trim() ?? undefined,
        rawContent: patch.content?.trim() ?? undefined,
        status: "active",
      },
      select: {
        id: true,
        title: true,
        sourceType: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        rawContent: true,
      },
    });
  }

  async remove(user: JwtPayload, id: string) {
    const existing = await this.prisma.knowledgeDocument.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException("Document not found");
    await this.prisma.knowledgeDocument.delete({ where: { id } });
    return { deleted: true };
  }
}
