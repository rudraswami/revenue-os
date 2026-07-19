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
  /** Structured judgment — Phase 2 (optional; v1 consumers ignore). */
  customerNeeds?: string[];
  /** Checklist for Compose — what the reply must cover. */
  replyBrief?: string;
  language?: ClassificationLanguage;
  entities?: ClassificationEntities;
  dealTemperature?: DealTemperature;
  /** Customer questions not yet answered in the thread. */
  unansweredFromCustomer?: string[];
  apologyRequired?: boolean;
  recoveryMode?: boolean;
  requiresOwner?: boolean;
  buyingSignals?: string[];
}

export const CLASSIFICATION_LANGUAGES = ["en", "hi", "hinglish", "mixed"] as const;
export type ClassificationLanguage = (typeof CLASSIFICATION_LANGUAGES)[number];

export const DEAL_TEMPERATURES = ["cold", "warm", "hot"] as const;
export type DealTemperature = (typeof DEAL_TEMPERATURES)[number];

export interface ClassificationEntities {
  location?: string;
  budget?: string;
  product?: string;
  quantity?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
