import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload } from "@growvisi/shared";
import { AgencyService } from "./agency.service";

class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  displayName!: string;
}

@Controller("agency")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class AgencyController {
  constructor(private readonly agency: AgencyService) {}

  @Get("status")
  status(@CurrentUser() user: JwtPayload) {
    return this.agency.getStatus(user);
  }

  @Get("clients")
  listClients(@CurrentUser() user: JwtPayload) {
    return this.agency.listClients(user);
  }

  @Get("clients/health-summary")
  clientsHealthSummary(@CurrentUser() user: JwtPayload) {
    return this.agency.getClientsHealthSummary(user);
  }

  @Post("enable")
  @Roles("OWNER", "ADMIN")
  enable(@CurrentUser() user: JwtPayload) {
    return this.agency.enableAgencyMode(user);
  }

  @Post("clients")
  @Roles("OWNER", "ADMIN")
  createClient(@CurrentUser() user: JwtPayload, @Body() dto: CreateClientDto) {
    return this.agency.createClient(user, dto.displayName);
  }
}
