import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import { requestContext } from "../context/request-context";

export const REQUEST_ID_HEADER = "x-request-id";

/** Assign or propagate a correlation id for every HTTP request. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id =
    (typeof incoming === "string" && incoming.trim()) ||
    (Array.isArray(incoming) && incoming[0]?.trim()) ||
    randomUUID();
  req.headers[REQUEST_ID_HEADER] = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  requestContext.run({ requestId: id }, () => next());
}
