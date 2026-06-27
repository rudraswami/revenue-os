import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload } from "@growvisi/shared";
import { AuditService } from "./audit.service";

const ADMIN_ROLES = ["OWNER", "ADMIN"] as const;

@Controller("audit")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get("logs")
  @Roles(...ADMIN_ROLES)
  list(@CurrentUser() user: JwtPayload, @Query("limit") limitRaw?: string) {
    const limit = Math.min(Math.max(parseInt(limitRaw ?? "50", 10) || 50, 1), 200);
    return this.audit.listForOrganization(user.organizationId, limit);
  }
}
