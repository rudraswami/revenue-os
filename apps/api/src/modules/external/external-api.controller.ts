import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { ApiKeyAuth, type ApiKeyAuthContext } from "../../common/decorators/api-key-auth.decorator";
import { ApiKeyGuard } from "../../common/guards/api-key.guard";
import { ExternalApiService } from "./external-api.service";

@Controller("external")
@UseGuards(ApiKeyGuard, ThrottlerGuard)
@Throttle({ default: { limit: 120, ttl: 60_000 } })
export class ExternalApiController {
  constructor(private readonly external: ExternalApiService) {}

  @Get("leads")
  listLeads(
    @ApiKeyAuth() auth: ApiKeyAuthContext,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.external.listLeads(
      auth,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 50,
    );
  }

  @Get("conversations")
  listConversations(
    @ApiKeyAuth() auth: ApiKeyAuthContext,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.external.listConversations(
      auth,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 50,
    );
  }
}
