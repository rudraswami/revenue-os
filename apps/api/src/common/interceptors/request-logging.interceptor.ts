import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { REQUEST_ID_HEADER } from "../middleware/request-id.middleware";

/** Structured JSON request log with duration and correlation id. */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();

    const req = context.switchToHttp().getRequest<{
      method?: string;
      url?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const res = context.switchToHttp().getResponse<{ statusCode?: number }>();
    const start = Date.now();
    const rawId = req.headers?.[REQUEST_ID_HEADER];
    const requestId = Array.isArray(rawId) ? rawId[0] : rawId;

    const log = (level: "log" | "warn", extra?: Record<string, unknown>) => {
      const line = JSON.stringify({
        requestId,
        method: req.method,
        path: req.url,
        status: res.statusCode,
        durationMs: Date.now() - start,
        ...extra,
      });
      this.logger[level](line);
    };

    return next.handle().pipe(
      tap({
        next: () => log("log"),
        error: (err: Error) => log("warn", { error: err.message }),
      }),
    );
  }
}
