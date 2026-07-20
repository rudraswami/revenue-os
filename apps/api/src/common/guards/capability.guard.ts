import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { hasCapability, type Capability, type JwtPayload } from "@growvisi/shared";
import { CAPABILITIES_KEY } from "../decorators/require-capability.decorator";

@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Capability[]>(CAPABILITIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (!user?.role) {
      throw new ForbiddenException({
        message: "Insufficient permissions",
        code: "ROLE_REQUIRED",
      });
    }

    const missing = required.filter((cap) => !hasCapability(user.role, cap));
    if (missing.length > 0) {
      throw new ForbiddenException({
        message: "You do not have permission to do this.",
        code: "MISSING_CAPABILITY",
        capabilities: missing,
      });
    }
    return true;
  }
}
