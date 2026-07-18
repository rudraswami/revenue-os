import { applyDecorators, UseGuards } from "@nestjs/common";
import { EmailVerifiedGuard } from "../guards/email-verified.guard";

export const RequireEmailVerified = () => applyDecorators(UseGuards(EmailVerifiedGuard));
