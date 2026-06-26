import type { LeadStage } from "@growvisi/shared";

export type AssignmentStrategy = "round_robin" | "fixed_user";

export interface AssignmentRule {
  id: string;
  enabled: boolean;
  name: string;
  conditions: {
    stages?: LeadStage[];
    minScore?: number;
    tagIds?: string[];
    handoffOnly?: boolean;
  };
  strategy: AssignmentStrategy;
  userId?: string;
  poolUserIds?: string[];
}

export interface AssignmentRulesConfig {
  defaultStrategy: "round_robin" | "unassigned";
  defaultPoolUserIds: string[];
  lastRoundRobinIndex: number;
  applyOnNewConversation: boolean;
  applyOnHandoff: boolean;
  rules: AssignmentRule[];
}

export const DEFAULT_ASSIGNMENT_RULES: AssignmentRulesConfig = {
  defaultStrategy: "round_robin",
  defaultPoolUserIds: [],
  lastRoundRobinIndex: 0,
  applyOnNewConversation: true,
  applyOnHandoff: true,
  rules: [],
};

export function normalizeAssignmentRules(raw: unknown): AssignmentRulesConfig {
  const input = (raw && typeof raw === "object" ? raw : {}) as Partial<AssignmentRulesConfig>;
  const rules = Array.isArray(input.rules)
    ? input.rules
        .filter((r) => r && typeof r === "object")
        .map((r): AssignmentRule => {
          const rule = r as Partial<AssignmentRule>;
          return {
            id: String(rule.id ?? cryptoRandomId()),
            enabled: rule.enabled !== false,
            name: String(rule.name ?? "Rule").slice(0, 80),
            conditions: {
              stages: Array.isArray(rule.conditions?.stages)
                ? rule.conditions.stages.filter(Boolean)
                : undefined,
              minScore:
                typeof rule.conditions?.minScore === "number"
                  ? rule.conditions.minScore
                  : undefined,
              tagIds: Array.isArray(rule.conditions?.tagIds)
                ? rule.conditions.tagIds.map(String)
                : undefined,
              handoffOnly: rule.conditions?.handoffOnly === true,
            },
            strategy: rule.strategy === "fixed_user" ? "fixed_user" : "round_robin",
            userId: rule.userId ? String(rule.userId) : undefined,
            poolUserIds: Array.isArray(rule.poolUserIds)
              ? rule.poolUserIds.map(String)
              : [],
          };
        })
    : [];

  return {
    defaultStrategy:
      input.defaultStrategy === "unassigned" ? "unassigned" : "round_robin",
    defaultPoolUserIds: Array.isArray(input.defaultPoolUserIds)
      ? input.defaultPoolUserIds.map(String)
      : [],
    lastRoundRobinIndex:
      typeof input.lastRoundRobinIndex === "number" ? input.lastRoundRobinIndex : 0,
    applyOnNewConversation: input.applyOnNewConversation !== false,
    applyOnHandoff: input.applyOnHandoff !== false,
    rules,
  };
}

function cryptoRandomId(): string {
  return `rule_${Math.random().toString(36).slice(2, 10)}`;
}
