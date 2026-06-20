import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>("CRON_SECRET")?.trim();
    if (!secret) {
      throw new UnauthorizedException("CRON_SECRET is not configured");
    }

    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string; "x-cron-secret"?: string };
    }>();

    const auth = req.headers.authorization;
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    const header = req.headers["x-cron-secret"];

    if (bearer === secret || header === secret) {
      return true;
    }

    throw new UnauthorizedException("Invalid cron secret");
  }
}
