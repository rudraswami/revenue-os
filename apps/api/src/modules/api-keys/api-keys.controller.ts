import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsNotEmpty, IsString } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload } from "@growvisi/shared";
import { ApiKeysService } from "./api-keys.service";

class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

@Controller("api-keys")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  @Roles("OWNER", "ADMIN")
  list(@CurrentUser() user: JwtPayload) {
    return this.apiKeys.list(user);
  }

  @Post()
  @Roles("OWNER", "ADMIN")
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateApiKeyDto) {
    return this.apiKeys.create(user, dto.name);
  }

  @Delete(":id")
  @Roles("OWNER", "ADMIN")
  revoke(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.apiKeys.revoke(user, id);
  }
}
