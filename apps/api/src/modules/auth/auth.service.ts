import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import type { JwtPayload } from "@revenue-os/shared";
import { DEFAULT_PIPELINE_STAGES } from "@revenue-os/shared";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const slug = this.slugify(dto.organizationName);
    const slugTaken = await this.prisma.organization.findUnique({ where: { slug } });
    if (slugTaken) {
      throw new ConflictException("Organization name unavailable");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          emailVerified: new Date(),
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      await tx.workspace.create({
        data: {
          organizationId: organization.id,
          name: "Default",
          slug: "default",
          isDefault: true,
        },
      });

      await tx.pipelineStage.createMany({
        data: DEFAULT_PIPELINE_STAGES.map((s) => ({
          organizationId: organization.id,
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
          organizationId: organization.id,
          planId: "trial",
          status: "TRIALING",
        },
      });

      return { user, organization };
    });

    const tokens = await this.issueTokens({
      sub: result.user.id,
      email: result.user.email,
      organizationId: result.organization.id,
      role: "OWNER",
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const organization = await this.prisma.organization.findUnique({
      where: { slug: dto.organizationSlug },
    });
    if (!organization) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
    });
    if (!member) {
      throw new UnauthorizedException("Not a member of this organization");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens({
      sub: user.id,
      email: user.email,
      organizationId: organization.id,
      role: member.role as JwtPayload["role"],
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const member = await this.prisma.organizationMember.findFirst({
      where: { userId: stored.userId },
      orderBy: { joinedAt: "asc" },
    });
    if (!member) {
      throw new UnauthorizedException();
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens({
      sub: stored.user.id,
      email: stored.user.email,
      organizationId: member.organizationId,
      role: member.role as JwtPayload["role"],
    });
  }

  private async issueTokens(payload: JwtPayload) {
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString("hex");
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private slugify(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }
}
