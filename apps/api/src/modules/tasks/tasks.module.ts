import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { MembershipRoleGuard } from "../../common/guards/membership-role.guard";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  imports: [BillingModule],
  controllers: [TasksController],
  providers: [TasksService, MembershipRoleGuard],
})
export class TasksModule {}
