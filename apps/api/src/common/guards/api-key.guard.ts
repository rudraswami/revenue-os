import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiKeysService } from "../../modules/api-keys/api-keys.service";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      apiKeyAuth?: unknown;
    }>();

    const raw = this.extractKey(request.headers);
    if (!raw) {
      throw new UnauthorizedException("API key required. Use Authorization: Bearer gv_…");
    }

    request.apiKeyAuth = await this.apiKeys.authenticate(raw);
    return true;
  }

  private extractKey(headers: Record<string, string | string[] | undefined>): string | null {
    const auth = headers.authorization ?? headers.Authorization;
    if (typeof auth === "string" && auth.startsWith("Bearer ")) {
      const token = auth.slice(7).trim();
      if (token.startsWith("gv_")) return token;
    }
    const header = headers["x-api-key"] ?? headers["X-Api-Key"];
    if (typeof header === "string" && header.startsWith("gv_")) return header.trim();
    return null;
  }
}
