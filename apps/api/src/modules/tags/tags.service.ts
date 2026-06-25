import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EntitlementsService } from "../billing/entitlements.service";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

@Injectable()
export class TagsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async list(user: JwtPayload) {
    const tags = await this.prisma.tag.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
      include: { _count: { select: { leads: true } } },
    });
    return tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      leadCount: t._count.leads,
    }));
  }

  async create(user: JwtPayload, name: string, color?: string) {
    await this.entitlements.assertHasAccess(user.organizationId);
    const clean = name.trim().slice(0, 40);
    if (!clean) throw new ForbiddenException("Tag name required");
    const safeColor = color && HEX_COLOR.test(color) ? color : "#006c49";

    const existing = await this.prisma.tag.findUnique({
      where: { organizationId_name: { organizationId: user.organizationId, name: clean } },
    });
    if (existing) return existing;

    return this.prisma.tag.create({
      data: { organizationId: user.organizationId, name: clean, color: safeColor },
    });
  }

  async update(user: JwtPayload, id: string, data: { name?: string; color?: string }) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!tag) throw new NotFoundException();
    return this.prisma.tag.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim().slice(0, 40) } : {}),
        ...(data.color && HEX_COLOR.test(data.color) ? { color: data.color } : {}),
      },
    });
  }

  async remove(user: JwtPayload, id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!tag) throw new NotFoundException();
    await this.prisma.tag.delete({ where: { id } });
    return { ok: true };
  }

  private async assertLeadInOrg(user: JwtPayload, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException("Lead not found");
  }

  async assignToLead(user: JwtPayload, leadId: string, tagId: string) {
    await this.assertLeadInOrg(user, leadId);
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, organizationId: user.organizationId },
    });
    if (!tag) throw new NotFoundException("Tag not found");

    await this.prisma.leadTag.upsert({
      where: { leadId_tagId: { leadId, tagId } },
      create: { leadId, tagId },
      update: {},
    });
    return { ok: true };
  }

  async unassignFromLead(user: JwtPayload, leadId: string, tagId: string) {
    await this.assertLeadInOrg(user, leadId);
    await this.prisma.leadTag.deleteMany({ where: { leadId, tagId } });
    return { ok: true };
  }
}
