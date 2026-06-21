import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "crypto";
import type { JwtPayload } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";

export interface ReplyTemplate {
  id: string;
  title: string;
  body: string;
}

const DEFAULT_REPLY_TEMPLATES: ReplyTemplate[] = [
  {
    id: "thanks",
    title: "Thanks for reaching out",
    body: "Hi! Thanks for messaging us. How can we help you today?",
  },
  {
    id: "follow-up",
    title: "Following up",
    body: "Hi! Just checking in — did you have any questions about our offer?",
  },
  {
    id: "pricing",
    title: "Share pricing",
    body: "Happy to share pricing details. What package or quantity are you looking at?",
  },
];

function normalizeTemplates(raw: unknown): ReplyTemplate[] {
  if (!Array.isArray(raw)) return DEFAULT_REPLY_TEMPLATES;
  const parsed = raw
    .filter((t) => t && typeof t === "object")
    .map((t) => {
      const item = t as { id?: string; title?: string; body?: string };
      return {
        id: item.id?.trim() || randomBytes(6).toString("hex"),
        title: String(item.title ?? "").trim(),
        body: String(item.body ?? "").trim(),
      };
    })
    .filter((t) => t.title && t.body);
  return parsed.length > 0 ? parsed : DEFAULT_REPLY_TEMPLATES;
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(user: JwtPayload) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true, avatarUrl: true } },
          },
        },
        _count: {
          select: {
            conversations: true,
            leads: true,
          },
        },
      },
    });
    if (!org) throw new NotFoundException("Organization not found");
    return org;
  }

  async listMembers(user: JwtPayload) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: user.organizationId },
      include: {
        user: { select: { id: true, email: true, name: true, avatarUrl: true, lastLoginAt: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
  }

  async getReplyTemplates(user: JwtPayload) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });
    if (!org) throw new NotFoundException("Organization not found");
    const settings = (org.settings ?? {}) as Record<string, unknown>;
    return { templates: normalizeTemplates(settings.replyTemplates) };
  }

  async updateReplyTemplates(
    user: JwtPayload,
    templates?: Array<{ id?: string; title: string; body: string }>,
  ) {
    const normalized = normalizeTemplates(templates);
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });
    if (!org) throw new NotFoundException("Organization not found");
    const settings = (org.settings ?? {}) as Record<string, unknown>;
    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        settings: {
          ...settings,
          replyTemplates: normalized as unknown as object,
        },
      },
    });
    return { templates: normalized };
  }
}
