import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface ApiKeyAuthContext {
  organizationId: string;
  apiKeyId: string;
  scopes: string[];
}

export const ApiKeyAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKeyAuthContext => {
    const request = ctx.switchToHttp().getRequest<{ apiKeyAuth?: ApiKeyAuthContext }>();
    if (!request.apiKeyAuth) {
      throw new Error("ApiKeyAuth decorator used without ApiKeyGuard");
    }
    return request.apiKeyAuth;
  },
);
