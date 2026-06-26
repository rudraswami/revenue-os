import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { IsBoolean, IsOptional } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import type { JwtPayload } from "@growvisi/shared";
import { AutomationsService } from "./automations.service";

class UpdateAutomationsDto {
  @IsOptional()
  @IsBoolean()
  welcome?: boolean;

  @IsOptional()
  @IsBoolean()
  followup?: boolean;

  @IsOptional()
  @IsBoolean()
  stage?: boolean;

  @IsOptional()
  @IsBoolean()
  notify?: boolean;

  @IsOptional()
  @IsBoolean()
  handoff?: boolean;
}

@Controller("automations")
@UseGuards(JwtAuthGuard)
export class AutomationsController {
  constructor(private readonly automations: AutomationsService) {}

  @Get("preferences")
  getPreferences(@CurrentUser() user: JwtPayload) {
    return this.automations.getPreferences(user);
  }

  @Patch("preferences")
  updatePreferences(@CurrentUser() user: JwtPayload, @Body() dto: UpdateAutomationsDto) {
    return this.automations.updatePreferences(user, dto);
  }

  @Get("logs")
  getLogs(@CurrentUser() user: JwtPayload) {
    return this.automations.getRecentLogs(user.organizationId);
  }

  @Get("stats")
  getStats(@CurrentUser() user: JwtPayload) {
    return this.automations.getLogStats(user.organizationId);
  }
}
