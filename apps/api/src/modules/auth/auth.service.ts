import {
  ConflictException,
  BadRequestException,
  Injectable,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import type { JwtPayload } from "@growvisi/shared";
import { DEFAULT_PIPELINE_STAGES, GROWVISI_WEB_URL } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ServerCacheService } from "../server-cache/server-cache.service";
import { EmailService } from "./email.service";
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, DeleteAccountDto, UpdateProfileDto, VerifyEmailDto } from "./dto/auth.dto";
import { isEmailVerificationRequired } from "../../config/email-verification";

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
  user: {
    id: string;
    email: string;
    name: string | null;
    locale: string;
    emailVerified: string | null;
  };
  organization: { id: string; name: string; slug: string; kind: string };
  role: JwtPayload["role"];
  accessToken: string;
  refreshToken: string;
  onboarding: OnboardingStatusResponse;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly serverCache: ServerCacheService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSessionResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    if (dto.inviteToken?.trim()) {
      return this.registerViaInvite(dto, passwordHash);
    }

    if (!dto.organizationName?.trim()) {
      throw new BadRequestException("Company name is required.");
    }

    const slug = this.slugify(dto.organizationName);
    const slugTaken = await this.prisma.organization.findUnique({ where: { slug } });
    if (slugTaken) {
      throw new ConflictException("This company name is already taken. Try a different name.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          ...(this.isVerificationRequired()
            ? {}
            : { emailVerified: new Date() }),
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName!.trim(),
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

    if (this.isVerificationRequired() && !result.user.emailVerified) {
      try {
        await this.sendVerificationEmail(result.user.id, result.user.email, result.user.name);
      } catch {
        this.logger.warn(`Verification email failed for ${result.user.email}`);
      }
    }

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
      select: { id: true, email: true, name: true, locale: true, emailVerified: true },
    });
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: user.organizationId,
          userId: user.sub,
        },
      },
      include: {
        organization: { select: { id: true, name: true, slug: true, kind: true } },
      },
    });
    if (!dbUser || !member) {
      throw new UnauthorizedException();
    }
    const org = member.organization;

    const onboarding = await this.getOnboardingStatus(user.organizationId);
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.sub },
      include: {
        organization: { select: { id: true, name: true, slug: true, kind: true } },
      },
      orderBy: { organization: { name: "asc" } },
    });

    return {
      user: {
        ...dbUser,
        emailVerified: dbUser.emailVerified?.toISOString() ?? null,
      },
      organization: org,
      role: member.role as JwtPayload["role"],
      onboarding,
      workspaces: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        kind: m.organization.kind,
        role: m.role,
        isCurrent: m.organizationId === user.organizationId,
      })),
    };
  }

  async updateProfile(user: JwtPayload, dto: UpdateProfileDto) {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException("Name is required.");
    }

    const dbUser = await this.prisma.user.update({
      where: { id: user.sub },
      data: {
        name,
        ...(dto.locale ? { locale: dto.locale } : {}),
      },
      select: { id: true, email: true, name: true, locale: true, emailVerified: true },
    });

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true, name: true, slug: true, kind: true },
    });
    if (!org) {
      throw new UnauthorizedException();
    }

    const onboarding = await this.getOnboardingStatus(user.organizationId);
    return {
      user: {
        ...dbUser,
        emailVerified: dbUser.emailVerified?.toISOString() ?? null,
      },
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

    if (!stored || stored.expiresAt < new Date()) {
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

    // Concurrent refresh (multi-tab): a recently-rotated token may arrive late.
    // Re-issue a session instead of forcing logout — real theft replays after grace.
    const ROTATION_GRACE_MS = 120_000;
    if (stored.revokedAt) {
      const revokedAgo = Date.now() - stored.revokedAt.getTime();
      if (revokedAgo > ROTATION_GRACE_MS) {
        throw new UnauthorizedException("Session expired. Please sign in again.");
      }
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

      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const resetUrl = `${this.appUrl()}/reset-password?token=${plainToken}`;

      try {
        await this.email.sendPasswordReset(user.email, resetUrl);
      } catch {
        // Swallow email errors so attacker cannot distinguish existing accounts
      }
    }

    return {
      ok: true,
      message: "If an account exists for that email, we sent a reset link.",
    };
  }

  async verifyEmail(token: string) {
    const tokenHash = this.hashToken(token);
    const stored = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException({
        message: "This verification link is invalid or has expired.",
        code: "INVALID_VERIFICATION_TOKEN",
      });
    }

    if (stored.user.emailVerified) {
      return {
        ok: true,
        alreadyVerified: true,
        message: "Your email is already verified.",
        emailVerified: stored.user.emailVerified.toISOString(),
      };
    }

    if (stored.usedAt) {
      throw new UnauthorizedException({
        message: "This verification link is invalid or has expired.",
        code: "INVALID_VERIFICATION_TOKEN",
      });
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException({
        message: "This verification link has expired.",
        code: "VERIFICATION_TOKEN_EXPIRED",
      });
    }

    const verifiedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { emailVerified: verifiedAt },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: stored.id },
        data: { usedAt: verifiedAt },
      }),
    ]);

    return {
      ok: true,
      message: "Email verified.",
      emailVerified: verifiedAt.toISOString(),
    };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, emailVerified: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.emailVerified) {
      throw new BadRequestException("Email is already verified.");
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await this.prisma.emailVerificationToken.count({
      where: { userId: user.id, createdAt: { gte: dayAgo } },
    });
    if (recentCount >= 10) {
      throw new BadRequestException("Too many verification emails sent. Try again later.");
    }

    await this.sendVerificationEmail(user.id, user.email, user.name);

    return { ok: true, message: "Verification email sent." };
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

  /** Permanently delete the signed-in user and sole-owner workspaces. */
  async deleteAccount(user: JwtPayload, dto: DeleteAccountDto) {
    if (dto.confirmation !== "DELETE") {
      throw new BadRequestException('Type DELETE in the confirmation field.');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
    });
    if (!dbUser?.passwordHash) {
      throw new UnauthorizedException();
    }

    const valid = await bcrypt.compare(dto.password, dbUser.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Incorrect password.");
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.sub },
      include: { organization: { select: { id: true, name: true } } },
    });

    const owned = memberships.filter((m) => m.role === "OWNER");
    for (const m of owned) {
      const memberCount = await this.prisma.organizationMember.count({
        where: { organizationId: m.organizationId },
      });
      if (memberCount > 1) {
        throw new BadRequestException(
          `Workspace "${m.organization.name}" has other members. Transfer ownership or ask them to remove you before deleting your account.`,
        );
      }
    }

    await Promise.all(
      memberships.map((m) =>
        this.serverCache.invalidateMembership(user.sub, m.organizationId),
      ),
    );

    await this.prisma.$transaction(async (tx) => {
      for (const m of owned) {
        await tx.organization.delete({ where: { id: m.organizationId } });
      }

      await tx.organizationMember.deleteMany({ where: { userId: user.sub } });
      await tx.refreshToken.updateMany({
        where: { userId: user.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.user.delete({ where: { id: user.sub } });
    });

    return {
      ok: true,
      message: "Your Growvisi account and workspace data have been deleted.",
    };
  }

  private async buildSessionResponse(
    payload: JwtPayload,
    user: {
      id: string;
      email: string;
      name: string | null;
      locale?: string;
      emailVerified?: Date | null;
    },
    organization: { id: string; name: string; slug: string; kind?: string },
  ): Promise<AuthSessionResponse> {
    const tokens = await this.issueTokens(payload);
    const onboarding = await this.getOnboardingStatus(organization.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        locale: user.locale ?? "en",
        emailVerified: user.emailVerified?.toISOString() ?? null,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        kind: organization.kind ?? "STANDARD",
      },
      role: payload.role,
      onboarding,
      ...tokens,
    };
  }

  async switchOrganization(userId: string, organizationId: string): Promise<AuthSessionResponse> {
    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: { user: true, organization: true },
    });
    if (!member) {
      throw new UnauthorizedException("You do not have access to that workspace.");
    }

    return this.buildSessionResponse(
      {
        sub: member.user.id,
        email: member.user.email,
        organizationId: member.organizationId,
        role: member.role as JwtPayload["role"],
      },
      member.user,
      member.organization,
    );
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
      complete: whatsappConnected && firstMessageReceived,
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
    const raw = this.config.get<string>("JWT_REFRESH_EXPIRES_IN") || "7d";
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

  private isVerificationRequired(): boolean {
    return isEmailVerificationRequired(this.config);
  }

  private appUrl(): string {
    return (
      this.config.get<string>("NEXT_PUBLIC_APP_URL") ??
      (process.env.NODE_ENV === "production" ? GROWVISI_WEB_URL : "http://localhost:3000")
    ).replace(/\/$/, "");
  }

  private async sendVerificationEmail(
    userId: string,
    email: string,
    name: string | null,
  ): Promise<void> {
    const plainToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(plainToken);

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    const verifyUrl = `${this.appUrl()}/verify-email?token=${plainToken}`;
    const firstName = name?.trim().split(/\s+/)[0] ?? "there";
    await this.email.sendEmailVerification({ to: email, firstName, verifyUrl });
  }

  private async registerViaInvite(
    dto: RegisterDto,
    passwordHash: string,
  ): Promise<AuthSessionResponse> {
    const tokenHash = this.hashToken(dto.inviteToken!.trim());
    const invite = await this.prisma.organizationInvite.findFirst({
      where: { tokenHash, acceptedAt: null },
      include: { organization: true },
    });
    if (!invite || invite.expiresAt < new Date()) {
      throw new BadRequestException("This invite link is invalid or expired.");
    }
    if (invite.email.toLowerCase() !== dto.email.toLowerCase()) {
      throw new BadRequestException("Use the same email address the invite was sent to.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const memberCount = await tx.organizationMember.count({
        where: { organizationId: invite.organizationId },
      });
      const sub = await tx.subscription.findUnique({
        where: { organizationId: invite.organizationId },
      });
      const { resolveSubscriptionAccess } = await import("@growvisi/shared");
      const access = resolveSubscriptionAccess(
        sub ?? { planId: "trial", status: "TRIALING", createdAt: new Date() },
      );
      if (memberCount >= access.limits.teamMembers) {
        throw new BadRequestException(
          "This workspace has reached its team member limit. Ask the owner to upgrade the plan.",
        );
      }

      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.name,
          emailVerified: new Date(),
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: invite.organizationId,
          userId: user.id,
          role: invite.role,
        },
      });

      await tx.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      return { user, organization: invite.organization };
    });

    await this.serverCache.invalidateMembership(result.user.id, invite.organizationId);

    return this.buildSessionResponse(
      {
        sub: result.user.id,
        email: result.user.email,
        organizationId: result.organization.id,
        role: invite.role,
      },
      result.user,
      result.organization,
    );
  }

  private slugify(name: string) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    if (!slug) {
      throw new BadRequestException(
        "Company name must contain at least one letter or number.",
      );
    }
    return slug;
  }
}
