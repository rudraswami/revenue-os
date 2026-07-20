import { Global, Module } from "@nestjs/common";
import { ServerCacheService } from "./server-cache.service";

@Global()
@Module({
  providers: [ServerCacheService],
  exports: [ServerCacheService],
})
export class ServerCacheModule {}
