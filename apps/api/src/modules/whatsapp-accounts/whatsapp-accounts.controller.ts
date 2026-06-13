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
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import type { JwtPayload } from "@growvisi/shared";
import { CompleteEmbeddedSignupDto } from "./dto/embedded-signup.dto";
import {
  ConnectWhatsappDto,
  CreateWhatsappAccountDto,
  DiscoverPhonesDto,
  UpdateWhatsappAccountDto,
  VerifyWhatsappCredentialsDto,
} from "./dto/whatsapp-account.dto";
import { EmbeddedSignupService } from "./embedded-signup.service";
import { WhatsappAccountsService } from "./whatsapp-accounts.service";

@Controller("whatsapp-accounts")
@UseGuards(JwtAuthGuard)
export class WhatsappAccountsController {
  constructor(
    private readonly accounts: WhatsappAccountsService,
    private readonly embeddedSignup: EmbeddedSignupService,
  ) {}

  @Get("embedded-signup/config")
  getEmbeddedSignupConfig() {
    return this.embeddedSignup.getPublicConfig();
  }

  @Post("embedded-signup/complete")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  completeEmbeddedSignup(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CompleteEmbeddedSignupDto,
  ) {
    return this.embeddedSignup.completeSignup(user, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.accounts.list(user);
  }

  @Get("technical")
  getTechnical() {
    return this.accounts.getTechnicalSetup();
  }

  @Post("discover-phones")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  discoverPhones(@Body() dto: DiscoverPhonesDto) {
    return this.accounts.discoverPhones(dto.accessToken);
  }

  @Post("connect")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  connect(@CurrentUser() user: JwtPayload, @Body() dto: ConnectWhatsappDto) {
    return this.accounts.connect(user, dto);
  }

  @Post("verify-credentials")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  verifyCredentials(@Body() dto: VerifyWhatsappCredentialsDto) {
    return this.accounts.verifyCredentials(dto.phoneNumberId, dto.accessToken);
  }

  @Post()
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateWhatsappAccountDto) {
    return this.accounts.create(user, dto);
  }

  @Patch(":id")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateWhatsappAccountDto,
  ) {
    return this.accounts.update(user, id, dto);
  }

  @Post(":id/verify")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  verify(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.accounts.verifyConnection(user, id);
  }

  @Delete(":id")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN")
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.accounts.remove(user, id);
  }
}
