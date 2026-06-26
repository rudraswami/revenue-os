import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { IsNotEmpty, IsString } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload } from "@growvisi/shared";
import { ApiKeysService } from "./api-keys.service";

class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

@Controller("api-keys")
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.apiKeys.list(user);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateApiKeyDto) {
    return this.apiKeys.create(user, dto.name);
  }

  @Delete(":id")
  revoke(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.apiKeys.revoke(user, id);
  }
}
