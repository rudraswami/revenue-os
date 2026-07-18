import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import type { Capability } from "@growvisi/shared";
import { CapabilityGuard } from "../guards/capability.guard";

export const CAPABILITIES_KEY = "capabilities";

/** Require one or more capabilities (user must have ALL listed). Runs after JwtAuthGuard. */
export const RequireCapability = (...capabilities: Capability[]) =>
  applyDecorators(SetMetadata(CAPABILITIES_KEY, capabilities), UseGuards(CapabilityGuard));
