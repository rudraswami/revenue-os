import { Injectable } from "@nestjs/common";
import type { AutomationSafetySettings } from "@growvisi/shared";
import { DEFAULT_AUTOMATION_SAFETY } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";

export interface SafetyRailInput {
  organizationId: string;
  conversationId: string;
  safety?: Partial<AutomationSafetySettings>;
}

export interface SafetyRailResult {
  blocked: boolean;
  code?: string;
  reason?: string;
}

@Injectable()
export class ReplySafetyRailsService {
  constructor(private readonly prisma: PrismaService) {}

  resolveSettings(overrides?: Partial<AutomationSafetySettings>): AutomationSafetySettings {
    return { ...DEFAULT_AUTOMATION_SAFETY, ...overrides };
  }

  /** Abuse / loop protection only — not a business policy gate. */
  async checkVelocity(input: SafetyRailInput): Promise<SafetyRailResult> {
    const settings = this.resolveSettings(input.safety);
    const since = new Date(Date.now() - settings.velocityWindowMinutes * 60 * 1000);

    const recentSends = await this.prisma.message.count({
      where: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        direction: "OUTBOUND",
        sentByAi: true,
        createdAt: { gte: since },
      },
    });

    if (recentSends >= settings.maxSendsPerVelocityWindow) {
      return {
        blocked: true,
        code: "safety_velocity",
        reason: `Paused briefly to prevent duplicate sends (${settings.maxSendsPerVelocityWindow} in ${settings.velocityWindowMinutes} min).`,
      };
    }

    return { blocked: false };
  }
}
