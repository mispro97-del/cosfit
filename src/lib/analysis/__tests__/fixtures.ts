// ============================================================
// COSFIT Analysis Engine - Test Fixtures
// 전체 테스트에서 공유하는 목(mock) 데이터
// ============================================================

import type {
  IngredientDictionaryEntry,
  HolyGrailInput,
  IngredientWithOrder,
  UserStandardProfile,
  FitScoreRequest,
  CompareResultInput,
  NormalizationFailureLog,
} from "../types";

// ────────────────────────────────────────────────────────────
// 성분 사전 (Normalizer 테스트용)
// ────────────────────────────────────────────────────────────

export const MOCK_DICTIONARY: IngredientDictionaryEntry[] = [
  {
    id: "ing_001",
    nameInci: "Niacinamide",
    nameKo: "나이아신아마이드",
    nameEn: "Niacinamide",
    casNumber: "98-92-0",
    aliases: ["Nicotinamide", "Vitamin B3", "비타민B3"],
    safetyGrade: "SAFE",
    ewgScore: 1,
    commonAllergen: false,
    category: "brightening",
    functions: ["brightening", "미백", "anti-aging"],
  },
  {
    id: "ing_002",
    nameInci: "Hyaluronic Acid",
    nameKo: "히알루론산",
    nameEn: "Hyaluronic Acid",
    casNumber: "9004-61-9",
    aliases: ["Sodium Hyaluronate", "HA", "히알루론산나트륨"],
    safetyGrade: "SAFE",
    ewgScore: 1,
    commonAllergen: false,
    category: "humectant",
    functions: ["humectant", "moisturizer", "보습"],
  },
  {
    id: "ing_003",
    nameInci: "Glycerin",
    nameKo: "글리세린",
    nameEn: "Glycerol",
    casNumber: "56-81-5",
    aliases: ["Glycerol", "글리세롤"],
    safetyGrade: "SAFE",
    ewgScore: 1,
    commonAllergen: false,
    category: "humectant",
    functions: ["humectant", "moisturizer", "보습", "emollient"],
  },
  {
    id: "ing_004",
    nameInci: "Butylene Glycol",
    nameKo: "부틸렌글라이콜",
    nameEn: "Butylene Glycol",
    casNumber: "107-88-0",
    aliases: ["1,3-Butanediol", "BG"],
    safetyGrade: "SAFE",
    ewgScore: 1,
    commonAllergen: false,
    category: "humectant",
    functions: ["humectant", "solvent"],
  },
  {
    id: "ing_005",
    nameInci: "Cetearyl Alcohol",
    nameKo: "세테아릴알코올",
    nameEn: "Cetearyl Alcohol",
    casNumber: "67762-27-0",
    aliases: ["Cetostearyl Alcohol"],
    safetyGrade: "SAFE",
    ewgScore: 1,
    commonAllergen: false,
    category: "emollient",
    functions: ["emollient", "occlusive", "보습"],
  },
  {
    id: "ing_006",
    nameInci: "Retinol",
    nameKo: "레티놀",
    nameEn: "Retinol",
    casNumber: "68-26-8",
    aliases: ["Vitamin A", "비타민A"],
    safetyGrade: "CAUTION",
    ewgScore: 4,
    commonAllergen: false,
    category: "anti-aging",
    functions: ["anti-aging", "안티에이징", "주름개선", "retinoid"],
  },
  {
    id: "ing_007",
    nameInci: "Fragrance",
    nameKo: "향료",
    nameEn: "Fragrance",
    casNumber: null,
    aliases: ["Parfum", "인공향료"],
    safetyGrade: "CAUTION",
    ewgScore: 8,
    commonAllergen: true,
    category: "fragrance",
    functions: ["fragrance"],
  },
  {
    id: "ing_008",
    nameInci: "Centella Asiatica Extract",
    nameKo: "센텔라아시아티카추출물",
    nameEn: "Centella Extract",
    casNumber: "84696-21-9",
    aliases: ["Cica", "시카", "병풀추출물"],
    safetyGrade: "SAFE",
    ewgScore: 1,
    commonAllergen: false,
    category: "soothing",
    functions: ["soothing", "진정", "anti-inflammatory", "calming"],
  },
  {
    id: "ing_009",
    nameInci: "Panthenol",
    nameKo: "판테놀",
    nameEn: "Panthenol",
    casNumber: "81-13-0",
    aliases: ["D-Panthenol", "Provitamin B5", "덱스판테놀"],
    safetyGrade: "SAFE",
    ewgScore: 1,
    commonAllergen: false,
    category: "soothing",
    functions: ["soothing", "진정", "moisturizer", "보습"],
  },
  {
    id: "ing_010",
    nameInci: "Phenoxyethanol",
    nameKo: "페녹시에탄올",
    nameEn: "Phenoxyethanol",
    casNumber: "122-99-6",
    aliases: ["2-Phenoxyethanol"],
    safetyGrade: "MODERATE",
    ewgScore: 4,
    commonAllergen: false,
    category: "preservative",
    functions: ["preservative", "방부제"],
  },
  {
    id: "ing_011",
    nameInci: "Adenosine",
    nameKo: "아데노신",
    nameEn: "Adenosine",
    casNumber: "58-61-7",
    aliases: [],
    safetyGrade: "SAFE",
    ewgScore: 1,
    commonAllergen: false,
    category: "anti-aging",
    functions: ["anti-aging", "안티에이징", "주름개선"],
  },
  {
    id: "ing_012",
    nameInci: "Methylisothiazolinone",
    nameKo: "메틸이소치아졸리논",
    nameEn: "MIT",
    casNumber: "2682-20-4",
    aliases: ["MIT", "MI"],
    safetyGrade: "HAZARDOUS",
    ewgScore: 9,
    commonAllergen: true,
    category: "preservative",
    functions: ["preservative", "방부제"],
  },
];

// ────────────────────────────────────────────────────────────
// 성분 목록 → IngredientWithOrder 변환 헬퍼
// ────────────────────────────────────────────────────────────

export function makeIngredient(
  entry: IngredientDictionaryEntry,
  orderIndex: number
): IngredientWithOrder {
  return {
    ingredientId: entry.id,
    nameInci: entry.nameInci,
    nameKo: entry.nameKo ?? undefined,
    orderIndex,
    safetyGrade: entry.safetyGrade,
    ewgScore: entry.ewgScore ?? undefined,
    commonAllergen: entry.commonAllergen,
    category: entry.category ?? undefined,
    functions: entry.functions,
  };
}

// ────────────────────────────────────────────────────────────
// 인생템 (Standard Generator / FIT Score 테스트용)
// ────────────────────────────────────────────────────────────

const D = MOCK_DICTIONARY;
const byId = (id: string) => D.find((d) => d.id === id)!;

/** 인생템 A: 보습 세럼 (공통: Niacinamide, HA, Glycerin, BG) */
export const HOLY_GRAIL_A: HolyGrailInput = {
  productName: "수분 세럼 A",
  category: "SERUM",
  satisfactionScore: 5,
  ingredients: [
    makeIngredient(byId("ing_003"), 1), // Glycerin
    makeIngredient(byId("ing_004"), 2), // Butylene Glycol
    makeIngredient(byId("ing_002"), 3), // Hyaluronic Acid
    makeIngredient(byId("ing_001"), 4), // Niacinamide
    makeIngredient(byId("ing_009"), 5), // Panthenol
    makeIngredient(byId("ing_011"), 20), // Adenosine
    makeIngredient(byId("ing_010"), 25), // Phenoxyethanol
  ],
};

/** 인생템 B: 보습 크림 (공통: Niacinamide, HA, Glycerin, BG, Cetearyl Alcohol) */
export const HOLY_GRAIL_B: HolyGrailInput = {
  productName: "보습 크림 B",
  category: "CREAM",
  satisfactionScore: 4,
  ingredients: [
    makeIngredient(byId("ing_003"), 1), // Glycerin
    makeIngredient(byId("ing_005"), 2), // Cetearyl Alcohol
    makeIngredient(byId("ing_004"), 3), // Butylene Glycol
    makeIngredient(byId("ing_002"), 4), // Hyaluronic Acid
    makeIngredient(byId("ing_001"), 6), // Niacinamide
    makeIngredient(byId("ing_008"), 8), // Centella Asiatica
    makeIngredient(byId("ing_011"), 18), // Adenosine
    makeIngredient(byId("ing_010"), 22), // Phenoxyethanol
  ],
};

/** 인생템 C: 진정 토너 (공통: Glycerin, BG, Centella, Panthenol) */
export const HOLY_GRAIL_C: HolyGrailInput = {
  productName: "진정 토너 C",
  category: "TONER",
  satisfactionScore: 5,
  ingredients: [
    makeIngredient(byId("ing_003"), 1), // Glycerin
    makeIngredient(byId("ing_004"), 2), // Butylene Glycol
    makeIngredient(byId("ing_008"), 3), // Centella Asiatica
    makeIngredient(byId("ing_009"), 4), // Panthenol
    makeIngredient(byId("ing_002"), 7), // Hyaluronic Acid
    makeIngredient(byId("ing_011"), 15), // Adenosine
  ],
};

export const TWO_HOLY_GRAILS: HolyGrailInput[] = [HOLY_GRAIL_A, HOLY_GRAIL_B];
export const THREE_HOLY_GRAILS: HolyGrailInput[] = [HOLY_GRAIL_A, HOLY_GRAIL_B, HOLY_GRAIL_C];

// ────────────────────────────────────────────────────────────
// 비교 대상 제품 (FIT Score 테스트용)
// ────────────────────────────────────────────────────────────

/** 좋은 매칭: 선호 성분 다수 포함, 리스크 없음 */
export const TARGET_PRODUCT_GOOD = {
  productId: "prod_good",
  name: "매칭 좋은 크림",
  category: "CREAM",
  ingredients: [
    makeIngredient(byId("ing_003"), 1), // Glycerin ✓
    makeIngredient(byId("ing_004"), 2), // BG ✓
    makeIngredient(byId("ing_002"), 3), // HA ✓
    makeIngredient(byId("ing_001"), 4), // Niacinamide ✓
    makeIngredient(byId("ing_009"), 5), // Panthenol ✓
    makeIngredient(byId("ing_008"), 6), // Centella ✓
    makeIngredient(byId("ing_011"), 15), // Adenosine
  ],
};

/** 나쁜 매칭: 선호 성분 거의 없고, 리스크 성분 포함 */
export const TARGET_PRODUCT_BAD = {
  productId: "prod_bad",
  name: "주의 필요 크림",
  category: "CREAM",
  ingredients: [
    makeIngredient(byId("ing_007"), 2), // Fragrance (allergen, EWG 8)
    makeIngredient(byId("ing_012"), 5), // MIT (hazardous, EWG 9)
    makeIngredient(byId("ing_006"), 8), // Retinol (caution, EWG 4)
    makeIngredient(byId("ing_010"), 15), // Phenoxyethanol
  ],
};

/** 중간 매칭: 일부 선호 + 일부 리스크 */
export const TARGET_PRODUCT_MIXED = {
  productId: "prod_mixed",
  name: "혼합 세럼",
  category: "SERUM",
  ingredients: [
    makeIngredient(byId("ing_003"), 1), // Glycerin ✓
    makeIngredient(byId("ing_001"), 3), // Niacinamide ✓
    makeIngredient(byId("ing_007"), 6), // Fragrance (risk)
    makeIngredient(byId("ing_006"), 10), // Retinol (caution)
    makeIngredient(byId("ing_010"), 20), // Phenoxyethanol
  ],
};

// ────────────────────────────────────────────────────────────
// CompareResult 통계 테스트용
// ────────────────────────────────────────────────────────────

export const MOCK_COMPARE_RESULTS: CompareResultInput[] = [
  {
    productId: "prod_001",
    productName: "수분 크림 A",
    userId: "user_001",
    fitScore: 88,
    fitGrade: "PERFECT",
    matchedGoodIngredients: ["Niacinamide", "Hyaluronic Acid", "Glycerin"],
    matchedRiskIngredients: [],
    createdAt: new Date("2025-06-01"),
  },
  {
    productId: "prod_001",
    productName: "수분 크림 A",
    userId: "user_002",
    fitScore: 72,
    fitGrade: "GOOD",
    matchedGoodIngredients: ["Niacinamide", "Glycerin"],
    matchedRiskIngredients: ["Fragrance"],
    createdAt: new Date("2025-06-02"),
  },
  {
    productId: "prod_001",
    productName: "수분 크림 A",
    userId: "user_003",
    fitScore: 45,
    fitGrade: "POOR",
    matchedGoodIngredients: ["Glycerin"],
    matchedRiskIngredients: ["Fragrance", "Phenoxyethanol"],
    createdAt: new Date("2025-06-03"),
  },
  {
    productId: "prod_002",
    productName: "톤업 세럼 B",
    userId: "user_001",
    fitScore: 92,
    fitGrade: "PERFECT",
    matchedGoodIngredients: ["Niacinamide", "Hyaluronic Acid"],
    matchedRiskIngredients: [],
    createdAt: new Date("2025-06-01"),
  },
  {
    productId: "prod_002",
    productName: "톤업 세럼 B",
    userId: "user_004",
    fitScore: 65,
    fitGrade: "FAIR",
    matchedGoodIngredients: ["Hyaluronic Acid"],
    matchedRiskIngredients: ["Retinol"],
    createdAt: new Date("2025-06-02"),
  },
];

// ────────────────────────────────────────────────────────────
// 정규화 실패 로그 (Stats 테스트용)
// ────────────────────────────────────────────────────────────

export const MOCK_FAILURE_LOGS: NormalizationFailureLog[] = [
  {
    rawName: "하이알루로닉애씨드",
    attemptedStrategies: ["EXACT", "ALIAS", "FUZZY"],
    closestMatch: { name: "Hyaluronic Acid", similarity: 0.55 },
    source: "KFDA_API",
    productContext: "제품X 전성분 3번째",
    timestamp: new Date("2025-06-01"),
  },
  {
    rawName: "UnknownIngredient123",
    attemptedStrategies: ["EXACT", "ALIAS", "CAS_NUMBER", "FUZZY"],
    closestMatch: undefined,
    source: "KFDA_API",
    timestamp: new Date("2025-06-02"),
  },
  {
    rawName: "하이알루로닉애씨드",
    attemptedStrategies: ["EXACT", "ALIAS", "FUZZY"],
    closestMatch: { name: "Hyaluronic Acid", similarity: 0.55 },
    source: "EWG_SCRAPER",
    timestamp: new Date("2025-06-03"),
  },
];
