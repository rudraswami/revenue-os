import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { LeadsService } from "./leads.service";
import type { JwtPayload, LeadStage } from "@growvisi/shared";
import type { MetricsPeriod } from "../../common/date-range";
import type { Response } from "express";

class UpdateStageDto {
  @IsEnum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"])
  stage!: LeadStage;

  @IsOptional()
  @IsString()
  reason?: string;
}

class UpdateLeadDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  valueCents?: number | null;
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
  funnel(@CurrentUser() user: JwtPayload, @Query("period") period?: MetricsPeriod) {
    return this.leads.funnelMetrics(user, period);
  }

  @Get("metrics/insights")
  insights(@CurrentUser() user: JwtPayload, @Query("period") period?: MetricsPeriod) {
    return this.leads.getInsights(user, period);
  }

  @Get("export")
  async exportCsv(
    @CurrentUser() user: JwtPayload,
    @Query("period") period: MetricsPeriod | undefined,
    @Res() res: Response,
  ) {
    const csv = await this.leads.exportCsv(user, period);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="growvisi-leads.csv"');
    res.send(csv);
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

  @Patch(":id")
  updateLead(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leads.updateLead(user, id, dto);
  }
}
