import { Module } from "@nestjs/common";
import { ApiKeyGuard } from "../../common/guards/api-key.guard";
import { ApiKeysModule } from "../api-keys/api-keys.module";
import { ExternalApiController } from "./external-api.controller";
import { ExternalApiService } from "./external-api.service";

@Module({
  imports: [ApiKeysModule],
  controllers: [ExternalApiController],
  providers: [ExternalApiService, ApiKeyGuard],
})
export class ExternalModule {}
