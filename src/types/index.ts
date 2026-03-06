// COSFIT - Core Type Definitions

export type FitGrade = "PERFECT" | "GOOD" | "FAIR" | "POOR" | "RISK";

export interface FitScoreResult {
  score: number;
  grade: FitGrade;
  matchedGood: IngredientMatch[];
  matchedRisk: IngredientRisk[];
  missingPreferred: MissingIngredient[];
  summary: string;
}

export interface IngredientMatch {
  ingredient: string;
  reason: string;
  impact: number;
}

export interface IngredientRisk {
  ingredient: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
}

export interface MissingIngredient {
  ingredient: string;
  importance: "HIGH" | "MEDIUM" | "LOW";
}

export interface PreferredIngredient {
  ingredient: string;
  weight: number;
  reason: string;
}

export interface AvoidIngredient {
  ingredient: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
}

export interface IngredientPattern {
  pattern: string;
  description: string;
  confidence: number;
}

export interface UserStandardData {
  preferredIngredients: PreferredIngredient[];
  avoidIngredients: AvoidIngredient[];
  ingredientPatterns: IngredientPattern[];
  categoryPreferences?: CategoryPreference[];
}

export interface CategoryPreference {
  category: string;
  preferredTexture?: string;
  preferredFormulation?: string;
  notes?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PartnerDashboardStats {
  totalCompares: number;
  averageFitScore: number;
  fitScoreDistribution: Record<FitGrade, number>;
  topMatchedIngredients: { ingredient: string; count: number }[];
  topRiskIngredients: { ingredient: string; count: number }[];
  uniqueUsers: number;
  trendData: TrendPoint[];
}

export interface TrendPoint {
  date: string;
  compares: number;
  avgFitScore: number;
}

export type OnboardingStep =
  | "SKIN_PROFILE"
  | "HOLY_GRAIL_REGISTRATION"
  | "STANDARD_GENERATION"
  | "COMPLETION";

export type UserRole = "USER" | "PARTNER" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  partnerId?: string | null;
}
