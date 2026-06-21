import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { JwtPayload, MembershipRole } from "@growvisi/shared";
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

/** Public invite preview — no auth */
@Controller("organizations/invites")
export class OrganizationInvitesController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get("preview")
  preview(@Query("token") token: string) {
    return this.organizations.previewInvite(token);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateInviteDto) {
    return this.organizations.createInvite(user, dto.email, dto.role ?? "AGENT");
  }

  @Post("accept")
  @UseGuards(JwtAuthGuard)
  accept(@CurrentUser() user: JwtPayload, @Body() dto: AcceptInviteDto) {
    return this.organizations.acceptInvite(user, dto.token);
  }
}
