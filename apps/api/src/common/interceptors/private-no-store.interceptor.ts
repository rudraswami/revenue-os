import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Response } from "express";
import { Observable, tap } from "rxjs";
import { setPrivateNoStore } from "../http/cache-headers";

/** Default Cache-Control for API responses unless a handler sets its own. */
@Injectable()
export class PrivateNoStoreInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }
    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        if (!res.getHeader("Cache-Control")) {
          setPrivateNoStore(res);
        }
      }),
    );
  }
}
