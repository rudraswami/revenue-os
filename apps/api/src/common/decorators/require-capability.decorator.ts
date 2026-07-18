import { SetMetadata } from "@nestjs/common";
import type { Capability } from "@growvisi/shared";

export const CAPABILITIES_KEY = "capabilities";

/** Require one or more capabilities (user must have ALL listed). */
export const RequireCapability = (...capabilities: Capability[]) =>
  SetMetadata(CAPABILITIES_KEY, capabilities);
