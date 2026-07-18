import { Injectable, Logger } from "@nestjs/common";
import type { LeadStage } from "@growvisi/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  withAssignmentMeta,
  type ConversationAssignmentMeta,
} from "../conversations/assignment-metadata";
import {
  normalizeAssignmentRules,
  type AssignmentRulesConfig,
  type AssignmentRule,
} from "../organizations/assignment-rules";

export interface AssignContext {
  conversationId: string;
  leadId?: string | null;
  handoff?: boolean;
  reason?: string;
}

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRules(organizationId: string): Promise<AssignmentRulesConfig> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    return normalizeAssignmentRules(settings.assignmentRules);
  }

  async updateRules(
    organizationId: string,
    patch: Partial<AssignmentRulesConfig>,
  ): Promise<AssignmentRulesConfig> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    const current = normalizeAssignmentRules(settings.assignmentRules);
    const next: AssignmentRulesConfig = {
      ...current,
      ...patch,
      rules: patch.rules ?? current.rules,
    };
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          assignmentRules: next as object,
        },
      },
    });
    return next;
  }

  async applyAutoAssign(organizationId: string, ctx: AssignContext): Promise<string | null> {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: ctx.conversationId, organizationId },
      select: { id: true, assignedToId: true, metadata: true },
    });
    if (!conv || conv.assignedToId) return conv?.assignedToId ?? null;

    const rules = await this.getRules(organizationId);
    const isHandoff =
      ctx.handoff ||
      (conv.metadata as Record<string, unknown>)?.requiresHuman === true;

    if (isHandoff && !rules.applyOnHandoff) return null;
    if (!isHandoff && !rules.applyOnNewConversation) return null;

    const lead = ctx.leadId
      ? await this.prisma.lead.findFirst({
          where: { id: ctx.leadId, organizationId },
          select: {
            id: true,
            stage: true,
            score: true,
            tags: { select: { tagId: true } },
          },
        })
      : null;

    const assignee = await this.resolveAssignee(organizationId, rules, {
      handoff: isHandoff,
      stage: lead?.stage as LeadStage | undefined,
      score: lead?.score,
      tagIds: lead?.tags.map((t) => t.tagId) ?? [],
    });

    if (!assignee) return null;

    const existingMeta =
      conv.metadata && typeof conv.metadata === "object"
        ? (conv.metadata as Record<string, unknown>)
        : {};

    const assignment: ConversationAssignmentMeta = {
      source: isHandoff ? "auto_handoff" : "auto_rule",
      reason: ctx.reason ?? (isHandoff ? "handoff" : "assignment_rule"),
      at: new Date().toISOString(),
      byUserId: null,
    };

    await this.prisma.conversation.update({
      where: { id: ctx.conversationId },
      data: {
        assignedToId: assignee,
        aiEnabled: false,
        metadata: withAssignmentMeta(existingMeta, assignment) as object,
      },
    });

    if (lead) {
      await this.prisma.lead.updateMany({
        where: { id: lead.id, ownerId: null },
        data: { ownerId: assignee },
      });
    }

    this.logger.log(
      `Auto-assigned conversation ${ctx.conversationId} to ${assignee}${ctx.reason ? ` (${ctx.reason})` : ""}`,
    );
    return assignee;
  }

  private async resolveAssignee(
    organizationId: string,
    config: AssignmentRulesConfig,
    ctx: {
      handoff: boolean;
      stage?: LeadStage;
      score?: number;
      tagIds: string[];
    },
  ): Promise<string | null> {
    for (const rule of config.rules) {
      if (!rule.enabled) continue;
      if (!this.ruleMatches(rule, ctx)) continue;
      const userId = await this.pickFromRule(organizationId, config, rule);
      if (userId) return userId;
    }

    if (config.defaultStrategy === "round_robin" && config.defaultPoolUserIds.length > 0) {
      return this.pickRoundRobin(organizationId, config, config.defaultPoolUserIds, "default");
    }

    return null;
  }

  private ruleMatches(
    rule: AssignmentRule,
    ctx: { handoff: boolean; stage?: LeadStage; score?: number; tagIds: string[] },
  ): boolean {
    const c = rule.conditions;
    if (c.handoffOnly && !ctx.handoff) return false;
    if (c.stages?.length && (!ctx.stage || !c.stages.includes(ctx.stage))) return false;
    if (c.minScore != null && (ctx.score ?? 0) < c.minScore) return false;
    if (c.tagIds?.length && !c.tagIds.some((id) => ctx.tagIds.includes(id))) return false;
    if (
      !c.handoffOnly &&
      !c.stages?.length &&
      c.minScore == null &&
      !c.tagIds?.length
    ) {
      return true;
    }
    return !!(c.handoffOnly || c.stages?.length || c.minScore != null || c.tagIds?.length);
  }

  private async pickFromRule(
    organizationId: string,
    config: AssignmentRulesConfig,
    rule: AssignmentRule,
  ): Promise<string | null> {
    if (rule.strategy === "fixed_user" && rule.userId) {
      const ok = await this.isEligibleAgent(organizationId, rule.userId);
      return ok ? rule.userId : null;
    }
    const pool = rule.poolUserIds?.length ? rule.poolUserIds : config.defaultPoolUserIds;
    if (pool.length === 0) return null;
    return this.pickRoundRobin(organizationId, config, pool, rule.id);
  }

  private async pickRoundRobin(
    organizationId: string,
    config: AssignmentRulesConfig,
    poolUserIds: string[],
    bucket: string,
  ): Promise<string | null> {
    const eligible: string[] = [];
    for (const userId of poolUserIds) {
      if (await this.isEligibleAgent(organizationId, userId)) eligible.push(userId);
    }
    if (eligible.length === 0) return null;

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const settings = (org?.settings ?? {}) as Record<string, unknown>;
    const current = normalizeAssignmentRules(settings.assignmentRules);
    const rrKey = `rr_${bucket}`;
    const rrState = (settings.assignmentRoundRobin ?? {}) as Record<string, number>;
    const idx = typeof rrState[rrKey] === "number" ? rrState[rrKey] : current.lastRoundRobinIndex;
    const nextIdx = idx % eligible.length;
    const userId = eligible[nextIdx];
    const newIdx = (idx + 1) % eligible.length;

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...settings,
          assignmentRules: { ...current, lastRoundRobinIndex: newIdx } as object,
          assignmentRoundRobin: { ...rrState, [rrKey]: newIdx } as object,
        },
      },
    });

    return userId;
  }

  private async isEligibleAgent(organizationId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId,
        role: { in: ["OWNER", "ADMIN", "MANAGER", "AGENT"] },
      },
      select: { id: true },
    });
    return !!member;
  }

  async getTeamWorkload(organizationId: string) {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId, role: { in: ["OWNER", "ADMIN", "MANAGER", "AGENT"] } },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    const rows = await Promise.all(
      members.map(async (m) => {
        const [openTasks, assignedConversations, handoffConversations] = await Promise.all([
          this.prisma.task.count({
            where: {
              organizationId,
              assignedToId: m.userId,
              status: { in: ["OPEN", "IN_PROGRESS"] },
            },
          }),
          this.prisma.conversation.count({
            where: { organizationId, assignedToId: m.userId, status: "OPEN" },
          }),
          this.prisma.conversation.count({
            where: {
              organizationId,
              assignedToId: m.userId,
              metadata: { path: ["requiresHuman"], equals: true },
            },
          }),
        ]);
        return {
          userId: m.userId,
          role: m.role,
          name: m.user.name,
          email: m.user.email,
          openTasks,
          assignedConversations,
          handoffConversations,
        };
      }),
    );

    const unassigned = await this.prisma.conversation.count({
      where: {
        organizationId,
        assignedToId: null,
        status: "OPEN",
      },
    });

    return { members: rows, unassignedConversations: unassigned };
  }
}
