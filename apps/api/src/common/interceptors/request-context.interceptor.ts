import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { JwtPayload } from "@growvisi/shared";
import { Observable } from "rxjs";
import { getRequestContext } from "../context/request-context";

/** Enrich async request context with authenticated user/org when available. */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === "http") {
      const req = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
      const store = getRequestContext();
      if (store && req.user) {
        store.userId = req.user.sub;
        store.organizationId = req.user.organizationId;
      }
    }
    return next.handle();
  }
}
