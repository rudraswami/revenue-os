import { Module } from "@nestjs/common";
import { KnowledgeController } from "./knowledge.controller";
import { KnowledgeEmbedService } from "./knowledge-embed.service";
import { KnowledgeService } from "./knowledge.service";

@Module({
  controllers: [KnowledgeController],
  providers: [KnowledgeService, KnowledgeEmbedService],
  exports: [KnowledgeService, KnowledgeEmbedService],
})
export class KnowledgeModule {}
