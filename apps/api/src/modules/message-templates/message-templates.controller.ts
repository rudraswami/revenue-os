import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RequireCapability } from "../../common/decorators/require-capability.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { SubscriptionGuard } from "../../common/guards/subscription.guard";
import type { JwtPayload } from "@growvisi/shared";
import { CreateMessageTemplateDto } from "./dto/create-message-template.dto";
import { DeleteMessageTemplateQueryDto } from "./dto/delete-message-template.dto";
import { UpdateMessageTemplateDto } from "./dto/update-message-template.dto";
import {
  MessageTemplatesService,
  type TemplateListStatusFilter,
} from "./message-templates.service";

const TEMPLATE_MANAGERS = ["OWNER", "ADMIN", "MANAGER"] as const;

@Controller("message-templates")
@UseGuards(JwtAuthGuard, SubscriptionGuard, MembershipRoleGuard)
export class MessageTemplatesController {
  constructor(private readonly templates: MessageTemplatesService) {}

  @Get("starters")
  @RequireCapability("campaigns.manage")
  @Roles(...TEMPLATE_MANAGERS)
  listStarters() {
    return this.templates.listStarters();
  }

  @Get()
  @RequireCapability("campaigns.manage")
  @Roles(...TEMPLATE_MANAGERS)
  list(
    @CurrentUser() user: JwtPayload,
    @Query("status") status?: TemplateListStatusFilter,
  ) {
    const filter: TemplateListStatusFilter =
      status === "approved" ||
      status === "pending" ||
      status === "rejected" ||
      status === "all"
        ? status
        : "all";
    return this.templates.list(user, filter);
  }

  @Post()
  @RequireCapability("campaigns.manage")
  @Roles("OWNER", "ADMIN")
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMessageTemplateDto) {
    return this.templates.create(user, dto);
  }

  @Post("sync")
  @RequireCapability("campaigns.manage")
  @Roles(...TEMPLATE_MANAGERS)
  sync(@CurrentUser() user: JwtPayload) {
    return this.templates.sync(user);
  }

  @Patch("edit")
  @RequireCapability("campaigns.manage")
  @Roles("OWNER", "ADMIN")
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMessageTemplateDto) {
    return this.templates.update(user, dto);
  }

  @Delete()
  @RequireCapability("campaigns.manage")
  @Roles("OWNER", "ADMIN")
  remove(@CurrentUser() user: JwtPayload, @Query() query: DeleteMessageTemplateQueryDto) {
    return this.templates.remove(user, query);
  }
}
