import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";

/**
 * Node's `fetch` throws bare `TypeError`s (no HTTP status) for network-level
 * failures — DNS, TLS, connection refused/reset, timeouts we raise ourselves.
 * Left uncaught, these surfaced to users as an unhelpful "Internal server
 * error" that looked identical to a real bug. Recognize them and respond with
 * something actionable instead.
 */
const UPSTREAM_NETWORK_ERROR_PATTERN =
  /ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|UNABLE_TO_VERIFY_LEAF_SIGNATURE|CERT_HAS_EXPIRED|fetch failed|timed out|timeout/i;

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === "string"
          ? body
          : Array.isArray((body as { message?: unknown }).message)
            ? ((body as { message: string[] }).message).join(", ")
            : ((body as { message?: string }).message ?? exception.message);

      response.status(status).json({ statusCode: status, message });
      return;
    }

    console.error(exception);

    const causeChain = [exception, (exception as { cause?: unknown })?.cause]
      .map((e) => (e instanceof Error ? `${e.message} ${e.name}` : ""))
      .join(" ");
    if (UPSTREAM_NETWORK_ERROR_PATTERN.test(causeChain)) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: "Could not reach an upstream service. Please try again in a moment.",
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message: "Internal server error",
    });
  }
}
