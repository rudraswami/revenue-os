import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { WhatsappService, type WhatsappWebhookPayload } from "./whatsapp.service";
import { sanitizeEnvValue } from "../../config/cors-origins";

@SkipThrottle()
@Controller("webhooks/whatsapp")
export class WhatsappWebhookController {
  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  verify(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") token: string,
    @Query("hub.challenge") challenge: string,
  ) {
    const verifyToken = sanitizeEnvValue(this.config.get<string>("WHATSAPP_VERIFY_TOKEN"));
    if (mode === "subscribe" && verifyToken && token === verifyToken) {
      return challenge;
    }
    throw new ForbiddenException();
  }

  @Post()
  async receive(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers("x-hub-signature-256") signature: string,
    @Body() body: WhatsappWebhookPayload,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(body));
    if (!this.whatsapp.verifySignature(rawBody, signature)) {
      throw new ForbiddenException(
        "Invalid signature — check WHATSAPP_APP_SECRET matches Meta App Secret",
      );
    }
    return this.whatsapp.ingestWebhook(body);
  }
}
