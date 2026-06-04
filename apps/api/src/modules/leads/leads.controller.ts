import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { LeadsService } from "./leads.service";
import type { JwtPayload, LeadStage } from "@growthsync/shared";

class UpdateStageDto {
  @IsEnum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"])
  stage!: LeadStage;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller("leads")
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get("pipeline")
  pipeline(@CurrentUser() user: JwtPayload) {
    return this.leads.listByStage(user);
  }

  @Get("metrics/funnel")
  funnel(@CurrentUser() user: JwtPayload) {
    return this.leads.funnelMetrics(user);
  }

  @Get(":id/timeline")
  timeline(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.leads.getTimeline(user, id);
  }

  @Patch(":id/stage")
  updateStage(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.leads.updateStage(user, id, dto.stage, dto.reason);
  }
}
