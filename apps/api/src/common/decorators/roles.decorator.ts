import { SetMetadata } from "@nestjs/common";
import type { MembershipRole } from "@growvisi/shared";

export const ROLES_KEY = "roles";
export const Roles = (...roles: MembershipRole[]) => SetMetadata(ROLES_KEY, roles);
