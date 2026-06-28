import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload } from "@growvisi/shared";
import { CompleteEmbeddedSignupDto } from "../whatsapp-accounts/dto/embedded-signup.dto";
import { QuickConnectWhatsappDto } from "../whatsapp-accounts/dto/whatsapp-account.dto";
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

  @Get("clients/:organizationId/whatsapp-summary")
  clientWhatsAppSummary(
    @CurrentUser() user: JwtPayload,
    @Param("organizationId") organizationId: string,
  ) {
    return this.agency.getClientWhatsAppSummary(user, organizationId);
  }

  @Post("clients/:organizationId/embedded-signup/complete")
  @Roles("OWNER", "ADMIN")
  completeClientEmbeddedSignup(
    @CurrentUser() user: JwtPayload,
    @Param("organizationId") organizationId: string,
    @Body() dto: CompleteEmbeddedSignupDto,
  ) {
    return this.agency.completeClientEmbeddedSignup(user, organizationId, dto);
  }

  @Post("clients/:organizationId/quick-connect")
  @Roles("OWNER", "ADMIN")
  quickConnectClient(
    @CurrentUser() user: JwtPayload,
    @Param("organizationId") organizationId: string,
    @Body() dto: QuickConnectWhatsappDto,
  ) {
    return this.agency.quickConnectClient(user, organizationId, dto);
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
