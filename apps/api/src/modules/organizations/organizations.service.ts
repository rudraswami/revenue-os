import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "crypto";
import type { JwtPayload, MembershipRole } from "@growvisi/shared";
import { GROWVISI_WEB_URL } from "@growvisi/shared";
import { EntitlementsService } from "../billing/entitlements.service";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "../auth/email.service";

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementsService,
  ) {}

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

  async previewInvite(token: string) {
    const tokenHash = createHash("sha256").update(token.trim()).digest("hex");
    const invite = await this.prisma.organizationInvite.findFirst({
      where: { tokenHash, acceptedAt: null },
      include: { organization: { select: { name: true, slug: true } } },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new NotFoundException("Invite not found or expired.");
    }
    return {
      email: invite.email,
      role: invite.role,
      organizationName: invite.organization.name,
      expiresAt: invite.expiresAt,
    };
  }

  async createInvite(user: JwtPayload, email: string, role: MembershipRole = "AGENT") {
    if (user.role !== "OWNER" && user.role !== "ADMIN") {
      throw new ForbiddenException("Only owners and admins can invite teammates.");
    }
    await this.entitlements.assertCanInviteMember(user.organizationId);

    const normalized = email.trim().toLowerCase();
    if (!normalized.includes("@")) {
      throw new BadRequestException("Enter a valid email address.");
    }

    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: user.organizationId,
        user: { email: normalized },
      },
    });
    if (existingMember) {
      throw new BadRequestException("This person is already on your team.");
    }

    const token = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    });
    if (!org) throw new NotFoundException();

    await this.prisma.organizationInvite.upsert({
      where: {
        organizationId_email: {
          organizationId: user.organizationId,
          email: normalized,
        },
      },
      create: {
        organizationId: user.organizationId,
        email: normalized,
        role,
        tokenHash,
        invitedById: user.sub,
        expiresAt,
      },
      update: {
        role,
        tokenHash,
        invitedById: user.sub,
        expiresAt,
        acceptedAt: null,
      },
    });

    const appUrl = (
      this.config.get<string>("NEXT_PUBLIC_APP_URL") ?? GROWVISI_WEB_URL
    ).replace(/\/$/, "");
    const inviteUrl = `${appUrl}/invite?token=${token}`;

    await this.email.sendTeamInvite({
      to: normalized,
      organizationName: org.name,
      inviteUrl,
      role,
    });

    return { sent: true, email: normalized, expiresAt };
  }

  async acceptInvite(user: JwtPayload, token: string) {
    const tokenHash = createHash("sha256").update(token.trim()).digest("hex");
    const invite = await this.prisma.organizationInvite.findFirst({
      where: { tokenHash, acceptedAt: null },
      include: { organization: true },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new BadRequestException("This invite link is invalid or expired.");
    }

    const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (!dbUser || dbUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new BadRequestException("Sign in with the email that received the invite.");
    }

    const existing = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId: user.sub,
        },
      },
    });
    if (existing) {
      await this.prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      return { organization: invite.organization, alreadyMember: true };
    }

    await this.prisma.$transaction([
      this.prisma.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId: user.sub,
          role: invite.role,
        },
      }),
      this.prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    return { organization: invite.organization, alreadyMember: false };
  }
}
