import { Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload } from "@revenue-os/shared";
import { PrismaService } from "../prisma/prisma.service";

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
}
