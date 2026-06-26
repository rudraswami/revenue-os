import { Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { KnowledgeEmbedService } from "./knowledge-embed.service";

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embed: KnowledgeEmbedService,
  ) {}

  async list(user: JwtPayload) {
    const docs = await this.prisma.knowledgeDocument.findMany({
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
        _count: { select: { chunks: true } },
      },
    });

    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      sourceType: d.sourceType,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      rawContent: d.rawContent,
      chunkCount: d._count.chunks,
    }));
  }

  async create(user: JwtPayload, title: string, content: string) {
    const doc = await this.prisma.knowledgeDocument.create({
      data: {
        organizationId: user.organizationId,
        title: title.trim(),
        rawContent: content.trim(),
        sourceType: "manual",
        status: "pending",
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

    const { chunks } = await this.embed.embedDocument(doc.id, user.organizationId);
    return { ...doc, status: chunks > 0 ? "indexed" : "active", chunkCount: chunks };
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

    const doc = await this.prisma.knowledgeDocument.update({
      where: { id },
      data: {
        title: patch.title?.trim() ?? undefined,
        rawContent: patch.content?.trim() ?? undefined,
        status: "pending",
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

    const { chunks } = await this.embed.embedDocument(doc.id, user.organizationId);
    return { ...doc, status: chunks > 0 ? "indexed" : "active", chunkCount: chunks };
  }

  async reindex(user: JwtPayload, id: string) {
    const existing = await this.prisma.knowledgeDocument.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException("Document not found");

    const { chunks } = await this.embed.embedDocument(id, user.organizationId);
    return { ok: true, chunkCount: chunks };
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
