import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JwtPayload } from "@growvisi/shared";
import { isEmailVerificationRequired } from "../../config/email-verification";
import { PrismaService } from "../../modules/prisma/prisma.service";

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!isEmailVerificationRequired(this.config)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;
    if (!user?.sub) {
      return false;
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { emailVerified: true },
    });
    if (!dbUser?.emailVerified) {
      throw new ForbiddenException({
        message: "Verify your email to activate your workspace.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    return true;
  }
}
