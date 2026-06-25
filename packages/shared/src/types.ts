export type LeadStage =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type MembershipRole = "OWNER" | "ADMIN" | "MANAGER" | "AGENT" | "VIEWER";

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: MembershipRole;
}

export interface AiClassificationResult {
  stage: LeadStage;
  confidence: number;
  intent: string;
  sentiment: "positive" | "neutral" | "negative";
  suggestedActions: string[];
  requiresHuman: boolean;
  summary?: string;
  tags?: string[];
  nextAction?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
