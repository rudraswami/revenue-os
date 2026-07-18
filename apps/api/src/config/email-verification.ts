import type { ConfigService } from "@nestjs/config";

/** When false, registration auto-verifies and guards skip (rollback / staged rollout). */
export function isEmailVerificationRequired(config: ConfigService): boolean {
  return config.get<string>("EMAIL_VERIFICATION_REQUIRED") !== "false";
}
