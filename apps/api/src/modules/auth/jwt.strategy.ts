import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtPayload } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import { JWT_AUDIENCE, JWT_ISSUER } from "./jwt.constants";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
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

    return {
      sub: payload.sub,
      email: payload.email,
      organizationId: payload.organizationId,
      role: member.role as JwtPayload["role"],
    };
  }
}
