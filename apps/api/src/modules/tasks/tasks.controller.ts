import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireCapability } from "../../common/decorators/require-capability.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload } from "@growvisi/shared";
import { TasksService } from "./tasks.service";

const STATUSES = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(PRIORITIES)
  priority?: (typeof PRIORITIES)[number];

  @IsOptional()
  @IsISO8601()
  dueAt?: string | null;

  @IsOptional()
  @IsString()
  assignedToId?: string | null;

  @IsOptional()
  @IsString()
  leadId?: string | null;
}

class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsEnum(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsEnum(PRIORITIES)
  priority?: (typeof PRIORITIES)[number];

  @IsOptional()
  @IsISO8601()
  dueAt?: string | null;

  @IsOptional()
  @IsString()
  assignedToId?: string | null;
}

const WRITE_ROLES = ["OWNER", "ADMIN", "MANAGER", "AGENT"] as const;

@Controller("tasks")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query("status") status?: (typeof STATUSES)[number],
    @Query("assignedToId") assignedToId?: string,
    @Query("leadId") leadId?: string,
    @Query("mine") mine?: string,
    @Query("scope") scope?: "open" | "all",
  ) {
    return this.tasks.list(user, {
      status,
      assignedToId,
      leadId,
      mine: mine === "true" || mine === "1",
      scope,
    });
  }

  @Get("summary")
  summary(@CurrentUser() user: JwtPayload) {
    return this.tasks.summary(user);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user, dto);
  }

  @Patch(":id")
  @Roles(...WRITE_ROLES)
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(user, id, dto);
  }

  @Delete(":id")
  @RequireCapability("tasks.delete")
  @Roles("OWNER", "ADMIN", "MANAGER")
  remove(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.tasks.remove(user, id);
  }
}
