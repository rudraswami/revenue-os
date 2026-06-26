import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { JwtPayload } from "@growvisi/shared";
import { SKIP_SUBSCRIPTION_CHECK } from "../decorators/skip-subscription-check.decorator";
import { EntitlementsService } from "../../modules/billing/entitlements.service";

/** Blocks CRM/product reads and writes when trial expired or subscription inactive. */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;
    if (!user?.organizationId) return true;

    await this.entitlements.assertHasAccess(user.organizationId);
    return true;
  }
}
