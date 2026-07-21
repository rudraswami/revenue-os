import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { JobType } from "@growvisi/shared";
import { QstashService } from "./qstash.service";

/**
 * Protects `POST /internal/jobs/:type`.
 *
 * Primary path: verify the Upstash `upstash-signature` header against the raw
 * request body (only possible when QStash signing keys are configured).
 * Fallback: a `CRON_SECRET` bearer, so the endpoint stays callable/testable in
 * environments without QStash signing keys — but never open.
 */
@Injectable()
export class QstashSignatureGuard implements CanActivate {
  constructor(
    private readonly qstash: QstashService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      params?: { type?: string };
      headers: Record<string, string | undefined>;
      rawBody?: Buffer;
      body?: unknown;
    }>();

    const type = req.params?.type as JobType | undefined;
    const signature = req.headers["upstash-signature"];

    if (this.qstash.canVerify() && typeof signature === "string" && type) {
      const raw = req.rawBody
        ? req.rawBody.toString("utf8")
        : JSON.stringify(req.body ?? {});
      const ok = await this.qstash.verify(signature, raw, type);
      if (ok) return true;
      throw new UnauthorizedException("Invalid QStash signature");
    }

    const secret = this.config.get<string>("CRON_SECRET")?.trim();
    if (secret) {
      const auth = req.headers.authorization;
      const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
      if (bearer === secret || req.headers["x-cron-secret"] === secret) {
        return true;
      }
    }

    throw new UnauthorizedException("Unauthorized job callback");
  }
}
