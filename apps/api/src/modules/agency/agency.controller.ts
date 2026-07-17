import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload } from "@growvisi/shared";
import { CompleteEmbeddedSignupDto } from "../whatsapp-accounts/dto/embedded-signup.dto";
import { AgencyService } from "./agency.service";

class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  displayName!: string;
}

class RenameClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  displayName!: string;
}

class InviteClientOwnerDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
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

  @Patch("clients/:organizationId")
  @Roles("OWNER", "ADMIN")
  renameClient(
    @CurrentUser() user: JwtPayload,
    @Param("organizationId") organizationId: string,
    @Body() dto: RenameClientDto,
  ) {
    return this.agency.renameClient(user, organizationId, dto.displayName);
  }

  @Delete("clients/:organizationId")
  @Roles("OWNER", "ADMIN")
  removeClient(
    @CurrentUser() user: JwtPayload,
    @Param("organizationId") organizationId: string,
  ) {
    return this.agency.removeClientFromPortfolio(user, organizationId);
  }

  @Post("clients/:organizationId/invite-owner")
  @Roles("OWNER", "ADMIN")
  inviteClientOwner(
    @CurrentUser() user: JwtPayload,
    @Param("organizationId") organizationId: string,
    @Body() dto: InviteClientOwnerDto,
  ) {
    return this.agency.inviteClientOwner(user, organizationId, dto.email);
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
