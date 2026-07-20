import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtPayload } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { JWT_AUDIENCE, JWT_ISSUER } from "./jwt.constants";
import { ServerCacheService } from "../server-cache/server-cache.service";
import { membershipCacheKey, SERVER_CACHE_TTL } from "../server-cache/server-cache.keys";
import {
  isCachedMembership,
  isMembershipRole,
} from "../server-cache/membership-cache.util";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: ServerCacheService,
  ) {
    const secret =
      config.get<string>("JWT_SECRET") ?? process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const cacheKey = membershipCacheKey(payload.sub, payload.organizationId);
    const cached = await this.cache.get<unknown>(cacheKey);

    if (isCachedMembership(cached)) {
      if (cached.userStatus !== "ACTIVE" || !isMembershipRole(cached.role)) {
        throw new UnauthorizedException();
      }
      return {
        sub: payload.sub,
        email: payload.email,
        organizationId: payload.organizationId,
        role: cached.role,
      };
    }

    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: payload.organizationId,
          userId: payload.sub,
        },
      },
      include: { user: true },
    });

    if (!member || member.user.status !== "ACTIVE") {
      throw new UnauthorizedException();
    }

    await this.cache.set(
      cacheKey,
      { role: member.role, userStatus: member.user.status },
      SERVER_CACHE_TTL.membershipSec,
    );

    return {
      sub: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      role: member.role as JwtPayload["role"],
    };
  }
}
