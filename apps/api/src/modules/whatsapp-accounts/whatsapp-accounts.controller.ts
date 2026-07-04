import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { SkipSubscriptionCheck } from "../../common/decorators/skip-subscription-check.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import { isProductionDeploy } from "../../config/production";
import type { JwtPayload } from "@growvisi/shared";
import { CompleteEmbeddedSignupDto } from "./dto/embedded-signup.dto";
import {
  ConnectWhatsappDto,
  CreateWhatsappAccountDto,
  DiscoverPhonesDto,
  QuickConnectWhatsappDto,
  RefreshWhatsappTokenDto,
  UpdateWhatsappAccountDto,
  VerifyWhatsappCredentialsDto,
} from "./dto/whatsapp-account.dto";
import { EmbeddedSignupService } from "./embedded-signup.service";
import { WhatsappAccountsService } from "./whatsapp-accounts.service";

@Controller("whatsapp-accounts")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class WhatsappAccountsController {
  constructor(
    private readonly accounts: WhatsappAccountsService,
    private readonly embeddedSignup: EmbeddedSignupService,
  ) {}

  @Get("embedded-signup/config")
  @SkipSubscriptionCheck()
  getEmbeddedSignupConfig() {
    return this.embeddedSignup.getPublicConfig();
  }

  @Get("embedded-signup/diagnose")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN")
  diagnoseEmbeddedSignup() {
    if (isProductionDeploy()) {
      throw new ForbiddenException("Diagnostics are not available in this environment.");
    }
    return this.embeddedSignup.diagnoseMetaApp();
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

  @Get("templates")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN", "MANAGER", "AGENT")
  listTemplates(@CurrentUser() user: JwtPayload) {
    return this.accounts.listMessageTemplates(user);
  }

  @Get("connection-health")
  connectionHealth(@CurrentUser() user: JwtPayload) {
    return this.accounts.getConnectionHealth(user);
  }

  @Get("onboarding-readiness")
  @SkipSubscriptionCheck()
  onboardingReadiness() {
    return this.accounts.getOnboardingReadiness();
  }

  @Get("onboarding-progress")
  @SkipSubscriptionCheck()
  onboardingProgress(@CurrentUser() user: JwtPayload) {
    return this.accounts.getOnboardingProgress(user);
  }

  @Get("technical")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN")
  getTechnical() {
    const setup = this.accounts.getTechnicalSetup();
    const token = setup.verifyToken;
    return {
      webhookUrl: setup.webhookUrl,
      hasVerifyToken: !!token,
      verifyTokenHint: token ? `${token.slice(0, 4)}…` : null,
    };
  }

  @Post("discover-phones")
  @SkipSubscriptionCheck()
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

  @Post("quick-connect")
  @SkipSubscriptionCheck()
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  quickConnect(@CurrentUser() user: JwtPayload, @Body() dto: QuickConnectWhatsappDto) {
    return this.accounts.quickConnect(user, dto);
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

  @Post(":id/refresh-token")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  refreshToken(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: RefreshWhatsappTokenDto,
  ) {
    return this.accounts.refreshAccessToken(user, id, dto.accessToken);
  }

  @Post(":id/verify")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  verify(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.accounts.verifyConnection(user, id);
  }

  @Post(":id/sync-templates")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN", "MANAGER")
  syncTemplates(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.accounts.syncTemplatesForAccount(user, id);
  }

  @Delete(":id")
  @UseGuards(MembershipRoleGuard)
  @Roles("OWNER", "ADMIN")
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.accounts.remove(user, id);
  }
}
