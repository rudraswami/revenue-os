import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import type { JwtPayload } from "@revenue-os/shared";
import { DEFAULT_PIPELINE_STAGES } from "@revenue-os/shared";
import { PrismaService } from "../prisma/prisma.service";
import { EmailService } from "./email.service";
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from "./dto/auth.dto";

export interface AuthOrganizationOption {
  id: string;
  name: string;
  slug: string;
}

export interface OnboardingStatusResponse {
  whatsappConnected: boolean;
  firstMessageReceived: boolean;
  complete: boolean;
}

export interface AuthSessionResponse {
  user: { id: string; email: string; name: string | null };
  organization: { id: string; name: string; slug: string };
  accessToken: string;
  refreshToken: string;
  onboarding: OnboardingStatusResponse;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSessionResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException("An account with this email already exists.");
    }

    const slug = this.slugify(dto.organizationName);
    const slugTaken = await this.prisma.organization.findUnique({ where: { slug } });
    if (slugTaken) {
      throw new ConflictException("This company name is already taken. Try a different name.");
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

    return this.buildSessionResponse(
      {
        sub: result.user.id,
        email: result.user.email,
        organizationId: result.organization.id,
        role: "OWNER",
      },
      result.user,
      result.organization,
    );
  }

  async login(
    dto: LoginDto,
  ): Promise<
    | AuthSessionResponse
    | { needsOrganizationSelection: true; organizations: AuthOrganizationOption[] }
  > {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException("Incorrect email or password.");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Incorrect email or password.");
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: { organization: true },
      orderBy: { joinedAt: "asc" },
    });

    if (memberships.length === 0) {
      throw new UnauthorizedException("No workspace found for this account.");
    }

    let member = memberships.find((m) => m.organizationId === dto.organizationId);
    if (dto.organizationId && !member) {
      throw new UnauthorizedException("You do not have access to that workspace.");
    }
    if (!dto.organizationId && memberships.length === 1) {
      member = memberships[0];
    }
    if (!member) {
      return {
        needsOrganizationSelection: true,
        organizations: memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
        })),
      };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.buildSessionResponse(
      {
        sub: user.id,
        email: user.email,
        organizationId: member.organizationId,
        role: member.role as JwtPayload["role"],
      },
      user,
      member.organization,
    );
  }

  async getMe(user: JwtPayload) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { id: true, email: true, name: true },
    });
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true, name: true, slug: true },
    });
    if (!dbUser || !org) {
      throw new UnauthorizedException();
    }

    const onboarding = await this.getOnboardingStatus(user.organizationId);
    return {
      user: dbUser,
      organization: org,
      role: user.role,
      onboarding,
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Session expired. Please sign in again.");
    }

    const member = await this.prisma.organizationMember.findFirst({
      where: {
        userId: stored.userId,
        organizationId: stored.organizationId,
      },
      include: { organization: true },
    });
    if (!member) {
      throw new UnauthorizedException();
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.buildSessionResponse(
      {
        sub: stored.user.id,
        email: stored.user.email,
        organizationId: member.organizationId,
        role: member.role as JwtPayload["role"],
      },
      stored.user,
      member.organization,
    );
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (user?.passwordHash) {
      const plainToken = randomBytes(32).toString("hex");
      const tokenHash = this.hashToken(plainToken);

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const appUrl = (this.config.get<string>("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000").replace(
        /\/$/,
        "",
      );
      const resetUrl = `${appUrl}/reset-password?token=${plainToken}`;

      await this.email.sendPasswordReset(user.email, resetUrl);
    }

    return {
      ok: true,
      message: "If an account exists for that email, we sent a reset link.",
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("This reset link is invalid or has expired.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { ok: true, message: "Password updated. You can sign in now." };
  }

  private async buildSessionResponse(
    payload: JwtPayload,
    user: { id: string; email: string; name: string | null },
    organization: { id: string; name: string; slug: string },
  ): Promise<AuthSessionResponse> {
    const tokens = await this.issueTokens(payload);
    const onboarding = await this.getOnboardingStatus(organization.id);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      onboarding,
      ...tokens,
    };
  }

  private async getOnboardingStatus(organizationId: string): Promise<OnboardingStatusResponse> {
    const [whatsappCount, inboundCount] = await Promise.all([
      this.prisma.whatsappAccount.count({
        where: { organizationId, isActive: true },
      }),
      this.prisma.message.count({
        where: {
          direction: "INBOUND",
          conversation: { organizationId },
        },
      }),
    ]);
    const whatsappConnected = whatsappCount > 0;
    const firstMessageReceived = inboundCount > 0;
    return {
      whatsappConnected,
      firstMessageReceived,
      complete: whatsappConnected,
    };
  }

  private async issueTokens(payload: JwtPayload) {
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString("hex");
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        organizationId: payload.organizationId,
        tokenHash,
        expiresAt: new Date(Date.now() + this.refreshExpiresMs()),
      },
    });

    return { accessToken, refreshToken };
  }

  private refreshExpiresMs(): number {
    const raw = this.config.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d";
    const match = /^(\d+)([smhd])$/.exec(raw.trim());
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] ?? multipliers.d);
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
