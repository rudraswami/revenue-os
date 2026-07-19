import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { RootController } from "./root.controller";

@Module({
  imports: [ConfigModule],
  controllers: [RootController, HealthController],
})
export class HealthModule {}
