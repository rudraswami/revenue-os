import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import type { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireEmailVerified } from "../../common/decorators/require-email-verified.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import type { JwtPayload, MembershipRole } from "@growvisi/shared";
import { setRefreshCookie } from "../auth/auth-cookie.util";
import { OrganizationsService } from "./organizations.service";

class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEnum(["ADMIN", "MANAGER", "AGENT", "VIEWER"])
  role?: MembershipRole;
}

class AcceptInviteDto {
  @IsString()
  token!: string;
}

const ADMIN_ROLES = ["OWNER", "ADMIN"] as const;
const INVITE_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

/** Public invite preview — no auth */
@Controller("organizations/invites")
export class OrganizationInvitesController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get("preview")
  preview(@Query("token") token: string) {
    return this.organizations.previewInvite(token);
  }

  @Get()
  @UseGuards(JwtAuthGuard, MembershipRoleGuard)
  @Roles(...INVITE_ROLES)
  list(@CurrentUser() user: JwtPayload) {
    return this.organizations.listInvites(user);
  }

  @Post()
  @RequireEmailVerified()
  @UseGuards(JwtAuthGuard, MembershipRoleGuard)
  @Roles(...INVITE_ROLES)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateInviteDto) {
    return this.organizations.createInvite(user, dto.email, dto.role ?? "AGENT");
  }

  @Delete(":inviteId")
  @UseGuards(JwtAuthGuard, MembershipRoleGuard)
  @Roles(...INVITE_ROLES)
  revoke(@CurrentUser() user: JwtPayload, @Param("inviteId") inviteId: string) {
    return this.organizations.revokeInvite(user, inviteId);
  }

  @Post("accept")
  @UseGuards(JwtAuthGuard)
  async accept(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AcceptInviteDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.organizations.acceptInvite(user, dto.token);
    setRefreshCookie(res, result.refreshToken);
    return result;
  }
}
