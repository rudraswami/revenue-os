import { AsyncLocalStorage } from "async_hooks";

export interface RequestContextStore {
  requestId?: string;
  organizationId?: string;
  userId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContextStore>();

export function getRequestContext(): RequestContextStore | undefined {
  return requestContext.getStore();
}

export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}
