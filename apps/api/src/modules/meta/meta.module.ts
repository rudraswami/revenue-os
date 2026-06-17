import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MetaDataDeletionController } from "./meta-data-deletion.controller";

@Module({
  imports: [PrismaModule],
  controllers: [MetaDataDeletionController],
})
export class MetaModule {}
