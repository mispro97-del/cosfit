// ============================================================
// COSFIT Analysis Engine - Type Definitions
// 성분 정규화, User Standard, FIT Score, 통계 집계 전용 타입
// ============================================================

// ────────────────────────────────────────────────────────────
// FR-03: 성분 정규화 (Ingredient Normalization)
// ────────────────────────────────────────────────────────────

/** 정규화 신뢰도 등급 */
export type NormConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNRESOLVED";

/** 정규화 단일 결과 */
export interface NormalizedIngredient {
  /** 원본 입력값 (식약처 raw 데이터 등) */
  rawName: string;
  /** 매핑된 INCI 표준명 (null이면 매핑 실패) */
  standardName: string | null;
  /** 매핑된 한글 표준명 */
  standardNameKo: string | null;
  /** 내부 성분 ID (DB PK) */
  ingredientId: string | null;
  /** 정규화 신뢰도 */
  confidence: NormConfidence;
  /** 매핑에 사용된 전략 */
  matchStrategy: "EXACT" | "ALIAS" | "FUZZY" | "CAS_NUMBER" | "NONE";
  /** 신뢰도가 낮은 이유 (있을 경우) */
  lowConfidenceReason?: string;
}

/** 정규화 배치 결과 */
export interface NormalizationBatchResult {
  results: NormalizedIngredient[];
  totalInput: number;
  resolved: number;
  unresolved: number;
  lowConfidence: number;
  overallConfidence: NormConfidence;
}

/** 정규화 실패 로그 (Admin DB 기록용) */
export interface NormalizationFailureLog {
  rawName: string;
  attemptedStrategies: string[];
  closestMatch?: { name: string; similarity: number };
  source: string;
  productContext?: string;
  timestamp: Date;
}

/** 성분 사전 엔트리 (매핑 테이블) */
export interface IngredientDictionaryEntry {
  id: string;
  nameInci: string;
  nameKo: string | null;
  nameEn: string | null;
  casNumber: string | null;
  aliases: string[];
  safetyGrade: string;
  ewgScore: number | null;
  commonAllergen: boolean;
  category: string | null;
  functions: string[];
}

// ────────────────────────────────────────────────────────────
// FR-04: User Standard 생성
// ────────────────────────────────────────────────────────────

/** 인생템 입력 (분석 엔진용) */
export interface HolyGrailInput {
  productName: string;
  category: string;
  satisfactionScore: number;
  ingredients: IngredientWithOrder[];
}

export interface IngredientWithOrder {
  ingredientId: string;
  nameInci: string;
  nameKo?: string;
  orderIndex: number;
  safetyGrade?: string;
  ewgScore?: number;
  commonAllergen?: boolean;
  category?: string;
  functions?: string[];
}

/** 선호 성분 (가중치 + 근거) */
export interface PreferredIngredient {
  ingredientId: string;
  nameInci: string;
  nameKo: string | null;
  weight: number;
  frequency: number;
  avgPosition: number;
  reason: string;
  functions: string[];
}

/** 주의 성분 */
export interface AvoidIngredient {
  ingredientId: string;
  nameInci: string;
  nameKo: string | null;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  source: "EWG" | "ALLERGEN" | "SAFETY_GRADE" | "USER_ALLERGY";
}

/** 성분 패턴 */
export interface DetectedPattern {
  patternId: string;
  name: string;
  nameKo: string;
  description: string;
  confidence: number;
  matchedIngredients: string[];
}

/** User Standard 전체 프로필 */
export interface UserStandardProfile {
  preferredIngredients: PreferredIngredient[];
  avoidIngredients: AvoidIngredient[];
  /** 인생템 전체에서 공통으로 배제된 성분 (하나도 포함되지 않은 자극 가능 성분) */
  excludedIngredients?: ExcludedIngredient[];
  detectedPatterns: DetectedPattern[];
  overallConfidence: number;
  basedOnProductCount: number;
  explain: UserStandardExplain;
}

/** 인생템에서 공통 배제된 성분 */
export interface ExcludedIngredient {
  nameInci: string;
  nameKo?: string;
  /** 몇 개의 인생템에서 빠져있는지 */
  excludedFromCount: number;
  /** 자극 가능성 */
  irritantRisk: "HIGH" | "MEDIUM" | "LOW";
}

/** 사용자 이해용 요약 */
export interface UserStandardExplain {
  headline: string;
  skinSummary: string;
  preferredSummary: string;
  avoidSummary: string;
  patternSummary: string;
  tips: string[];
}

// ────────────────────────────────────────────────────────────
// FR-05: FIT Score 산출
// ────────────────────────────────────────────────────────────

export type FitGrade = "PERFECT" | "GOOD" | "FAIR" | "POOR" | "RISK";

/** FIT Score 비교 요청 */
export interface FitScoreRequest {
  userStandard: UserStandardProfile;
  targetProduct: {
    productId: string;
    name: string;
    category: string;
    ingredients: IngredientWithOrder[];
    /** 데이터 완결성: FULL = 전성분 확보, PARTIAL = 일부 누락 */
    dataCompleteness?: "FULL" | "PARTIAL";
  };
  userAllergies?: string[];
  skinType?: "DRY" | "OILY" | "COMBINATION" | "NORMAL" | "SENSITIVE";
  sensitivityLevel?: number;
}

/** FIT Score 최종 결과 */
export interface FitScoreResult {
  score: number;
  grade: FitGrade;
  reasons: FitMatchGood[];
  risks: FitRisk[];
  missing: FitMissing[];
  novelRisks: FitNovelRisk[];
  /** 인생템 전체에서 공통 배제된 성분이 신규 제품에 포함된 경우 */
  exclusionFlags: FitExclusionFlag[];
  summary: string;
  explanations: string[];
  /** 데이터 불완전 경고 (PARTIAL 데이터) */
  dataWarning: string | null;
  breakdown: {
    baseScore: number;
    riskPenalty: number;
    bonusScore: number;
    skinSynergyBonus: number;
    novelRiskPenalty: number;
    exclusionPenalty: number;
    finalScore: number;
  };
  confidence: "HIGH" | "MEDIUM" | "LOW";
  metadata: {
    analysisModel: string;
    processingTimeMs: number;
    ingredientsCovered: number;
    totalProductIngredients: number;
    coverageRatio: number;
  };
}

/** 인생템에서 공통 배제된 성분 플래그 */
export interface FitExclusionFlag {
  ingredientId: string;
  nameInci: string;
  nameKo: string | null;
  reason: string;
  excludedFromCount: number;
  totalHolyGrails: number;
  penaltyScore: number;
  positionInProduct: number;
}

/** 인생템에 없는 신규 주의 성분 */
export interface FitNovelRisk {
  ingredientId: string;
  nameInci: string;
  nameKo: string | null;
  reason: string;
  safetyGrade: string;
  positionInProduct: number;
}

/** 매칭된 긍정 성분 */export interface FitMatchGood {
  ingredientId: string;
  nameInci: string;
  nameKo: string | null;
  reason: string;
  impactScore: number;
  positionInProduct: number;
}

/** 감지된 리스크 */
export interface FitRisk {
  ingredientId: string;
  nameInci: string;
  nameKo: string | null;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
  penaltyScore: number;
  source: string;
}

/** 누락 선호 성분 */
export interface FitMissing {
  ingredientId: string;
  nameInci: string;
  nameKo: string | null;
  importance: "HIGH" | "MEDIUM" | "LOW";
  weight: number;
}

/** FIT Score 최종 결과 — 위의 FitScoreResult 사용 */

// ────────────────────────────────────────────────────────────
// 통계 집계 (Partner/Admin)
// ────────────────────────────────────────────────────────────

/** 비교 결과 입력 (통계 집계용) */
export interface CompareResultInput {
  productId: string;
  productName: string;
  userId: string;
  fitScore: number;
  fitGrade: string;
  matchedGoodIngredients: string[];
  matchedRiskIngredients: string[];
  createdAt: Date;
}

export interface ProductFitStats {
  productId: string;
  productName: string;
  totalCompares: number;
  averageFitScore: number;
  medianFitScore: number;
  gradeDistribution: Record<FitGrade, number>;
  topMatchedIngredients: { nameInci: string; count: number }[];
  topRiskIngredients: { nameInci: string; count: number }[];
  uniqueUsers: number;
}

export interface PartnerAggregateStats {
  partnerId: string;
  period: { type: "DAILY" | "WEEKLY" | "MONTHLY"; date: Date };
  products: ProductFitStats[];
  overallAvgFitScore: number;
  totalCompares: number;
  uniqueUsers: number;
}
