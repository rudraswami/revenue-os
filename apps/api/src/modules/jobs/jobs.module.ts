import { Global, Module } from "@nestjs/common";
import { QstashService } from "./qstash.service";
import { JobsService } from "./jobs.service";
import { QstashSignatureGuard } from "./qstash-signature.guard";

/**
 * Global provider for the serverless-durable job transport. Feature modules
 * inject `JobsService` to enqueue work; `InternalModule` hosts the callback
 * controller that runs it.
 */
@Global()
@Module({
  providers: [QstashService, JobsService, QstashSignatureGuard],
  exports: [QstashService, JobsService, QstashSignatureGuard],
})
export class JobsModule {}
