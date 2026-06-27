import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { DEFAULT_PIPELINE_STAGES } from "@growvisi/shared";
import { EntitlementsService } from "../billing/entitlements.service";
import { PrismaService } from "../prisma/prisma.service";

export interface AgencyClientRow {
  id: string;
  displayName: string;
  organizationId: string;
  slug: string;
  createdAt: string;
  whatsappConnected: boolean;
  unreadMessages: number;
  handoffs: number;
  openPipelineInr: number;
  openLeads: number;
}

@Injectable()
export class AgencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async getStatus(user: JwtPayload) {
    const org = await this.prisma.organization.findFirst({
      where: { id: user.organizationId },
      select: { id: true, name: true, kind: true },
    });
    if (!org) throw new NotFoundException();

    const access = await this.entitlements.getAccess(org.id);
    const clientCount = await this.prisma.agencyClient.count({
      where: { agencyOrganizationId: org.id },
    });

    return {
      kind: org.kind,
      isAgency: org.kind === "AGENCY",
      canEnableAgency: access.planId === "pro" && org.kind === "STANDARD",
      clientCount,
      clientLimit: access.limits.agencyClients,
    };
  }

  async enableAgencyMode(user: JwtPayload) {
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      throw new ForbiddenException("Only workspace admins can enable agency mode.");
    }
    await this.entitlements.assertPlanAtLeast(user.organizationId, "pro");

    const org = await this.prisma.organization.findFirst({
      where: { id: user.organizationId },
      select: { id: true, kind: true, clientOfAgency: { select: { id: true } } },
    });
    if (!org) throw new NotFoundException();
    if (org.clientOfAgency) {
      throw new BadRequestException("Client workspaces cannot become agency hubs.");
    }
    if (org.kind === "AGENCY") {
      return { ok: true, kind: "AGENCY" as const };
    }

    await this.prisma.organization.update({
      where: { id: org.id },
      data: { kind: "AGENCY" },
    });

    return { ok: true, kind: "AGENCY" as const };
  }

  async listClients(user: JwtPayload): Promise<AgencyClientRow[]> {
    await this.assertAgencyHub(user);

    const links = await this.prisma.agencyClient.findMany({
      where: { agencyOrganizationId: user.organizationId },
      orderBy: { displayName: "asc" },
      include: {
        client: { select: { id: true, name: true, slug: true, createdAt: true } },
      },
    });

    const rows = await Promise.all(
      links.map(async (link) => {
        const orgId = link.clientOrganizationId;
        const [waActive, unreadAgg, handoffs, pipelineAgg, openLeads] = await Promise.all([
          this.prisma.whatsappAccount.count({ where: { organizationId: orgId, isActive: true } }),
          this.prisma.conversation.aggregate({
            where: { organizationId: orgId },
            _sum: { unreadCount: true },
          }),
          this.prisma.conversation.count({
            where: {
              organizationId: orgId,
              metadata: { path: ["requiresHuman"], equals: true },
            },
          }),
          this.prisma.lead.aggregate({
            where: {
              organizationId: orgId,
              stage: { notIn: ["WON", "LOST"] },
              valueCents: { not: null },
            },
            _sum: { valueCents: true },
          }),
          this.prisma.lead.count({
            where: {
              organizationId: orgId,
              stage: { notIn: ["WON", "LOST"] },
            },
          }),
        ]);

        return {
          id: link.id,
          displayName: link.displayName,
          organizationId: link.client.id,
          slug: link.client.slug,
          createdAt: link.createdAt.toISOString(),
          whatsappConnected: waActive > 0,
          unreadMessages: unreadAgg._sum.unreadCount ?? 0,
          handoffs,
          openPipelineInr: (pipelineAgg._sum.valueCents ?? 0) / 100,
          openLeads,
        };
      }),
    );

    return rows;
  }

  async createClient(user: JwtPayload, displayName: string) {
    if (!["OWNER", "ADMIN"].includes(user.role)) {
      throw new ForbiddenException("Only workspace admins can add client workspaces.");
    }
    await this.assertAgencyHub(user);
    const access = await this.entitlements.assertPlanAtLeast(user.organizationId, "pro");

    const count = await this.prisma.agencyClient.count({
      where: { agencyOrganizationId: user.organizationId },
    });
    if (count >= access.limits.agencyClients) {
      throw new ForbiddenException(
        `Your Pro plan allows ${access.limits.agencyClients} client workspaces. Upgrade limits or remove a client.`,
      );
    }

    const cleanName = displayName.trim();
    if (!cleanName) throw new BadRequestException("Client name is required.");

    const agency = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { slug: true },
    });
    const slug = await this.uniqueClientSlug(agency!.slug, cleanName);

    const agencyStaff = await this.prisma.organizationMember.findMany({
      where: {
        organizationId: user.organizationId,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: { userId: true, role: true },
    });

    const link = await this.prisma.$transaction(async (tx) => {
      const clientOrg = await tx.organization.create({
        data: {
          name: cleanName,
          slug,
          kind: "STANDARD",
        },
      });

      await tx.workspace.create({
        data: {
          organizationId: clientOrg.id,
          name: "Default",
          slug: "default",
          isDefault: true,
        },
      });

      await tx.pipelineStage.createMany({
        data: DEFAULT_PIPELINE_STAGES.map((s) => ({
          organizationId: clientOrg.id,
          leadStage: s.stage as never,
          name: s.name,
          order: s.order,
          color: s.color,
          isWon: "isWon" in s ? s.isWon : false,
          isLost: "isLost" in s ? s.isLost : false,
        })),
      });

      await tx.subscription.create({
        data: {
          organizationId: clientOrg.id,
          planId: "trial",
          status: "TRIALING",
        },
      });

      for (const member of agencyStaff) {
        await tx.organizationMember.create({
          data: {
            organizationId: clientOrg.id,
            userId: member.userId,
            role: member.role === "OWNER" ? "ADMIN" : "ADMIN",
          },
        });
      }

      return tx.agencyClient.create({
        data: {
          agencyOrganizationId: user.organizationId,
          clientOrganizationId: clientOrg.id,
          displayName: cleanName,
        },
        include: {
          client: { select: { id: true, name: true, slug: true } },
        },
      });
    });

    return {
      id: link.id,
      displayName: link.displayName,
      organizationId: link.client.id,
      slug: link.client.slug,
    };
  }

  private async assertAgencyHub(user: JwtPayload) {
    const org = await this.prisma.organization.findFirst({
      where: { id: user.organizationId },
      select: { kind: true },
    });
    if (!org || org.kind !== "AGENCY") {
      throw new ForbiddenException("Enable agency mode on a Pro workspace to manage clients.");
    }
  }

  private slugify(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32);
  }

  private async uniqueClientSlug(agencySlug: string, clientName: string) {
    const base = `${agencySlug}-${this.slugify(clientName)}`.slice(0, 48);
    let slug = base;
    let n = 0;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${base}-${n}`.slice(0, 48);
    }
    return slug;
  }
}
