import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { GROWVISI_WEB_URL } from "@growvisi/shared";
import { parseMetaSignedRequest } from "../../common/meta/parse-signed-request";
import { sanitizeEnvValue } from "../../config/cors-origins";
import { PrismaService } from "../prisma/prisma.service";

@Controller("webhooks/meta")
export class MetaDataDeletionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Meta App Dashboard → User data deletion → Data deletion callback URL.
   * https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
   */
  @Post("data-deletion")
  async handleDeletion(@Body() body: { signed_request?: string }) {
    const secret =
      sanitizeEnvValue(this.config.get<string>("META_APP_SECRET")) ??
      sanitizeEnvValue(this.config.get<string>("WHATSAPP_APP_SECRET"));
    if (!secret) {
      throw new BadRequestException("Meta app secret not configured");
    }
    if (!body.signed_request) {
      throw new BadRequestException("Missing signed_request");
    }

    let payload;
    try {
      payload = parseMetaSignedRequest(body.signed_request, secret);
    } catch {
      throw new BadRequestException("Invalid signed_request");
    }

    const confirmationCode = randomBytes(12).toString("hex");

    await this.prisma.webhookEvent.create({
      data: {
        source: "meta_data_deletion",
        eventType: confirmationCode,
        payload: {
          facebookUserId: payload.user_id,
          issuedAt: payload.issued_at,
          status: "received",
          note: "Meta callback received. Email privacy@growvisi.in if you need manual account removal.",
        },
      },
    });

    const appUrl = (
      sanitizeEnvValue(this.config.get<string>("NEXT_PUBLIC_APP_URL")) ?? GROWVISI_WEB_URL
    ).replace(/\/$/, "");

    return {
      url: `${appUrl}/data-deletion/status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    };
  }

  @Get("data-deletion/status")
  async deletionStatus(@Query("code") code: string) {
    if (!code?.trim()) {
      throw new BadRequestException("Missing code");
    }

    const event = await this.prisma.webhookEvent.findFirst({
      where: { source: "meta_data_deletion", eventType: code.trim() },
      orderBy: { createdAt: "desc" },
    });

    if (!event) {
      throw new NotFoundException("Deletion request not found");
    }

    const payload = event.payload as {
      facebookUserId?: string;
      status?: string;
      note?: string;
    };

    return {
      confirmationCode: code.trim(),
      status: payload.status ?? "received",
      receivedAt: event.createdAt,
      message:
        payload.note ??
        "We received your Meta data deletion request. If you have a Growvisi account, also delete it in Settings or email privacy@growvisi.in.",
    };
  }
}
