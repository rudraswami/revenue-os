import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    await this.$executeRawUnsafe(`SET search_path TO public, extensions`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
