// ============================================================
// COSFIT Test Fixtures
// 모든 분석 엔진 테스트에서 공유하는 목업 데이터
// ============================================================

import type {
  IngredientDictionaryEntry,
  HolyGrailInput,
  IngredientWithOrder,
} from "../lib/analysis/types";

// ────────────────────────────────────────────────────────────
// 성분 사전 (20개 대표 성분)
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
    functions: ["brightening", "미백", "skin conditioning"],
  },
  {
    id: "ing_002",
    nameInci: "Hyaluronic Acid",
    nameKo: "히알루론산",
    nameEn: "Hyaluronic Acid",
    casNumber: "9004-61-9",
    aliases: ["HA", "Sodium Hyaluronate", "히알루론산나트륨"],
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
    nameEn: "Glycerin",
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
    nameInci: "Cetearyl Alcohol",
    nameKo: "세테아릴알코올",
    nameEn: "Cetearyl Alcohol",
    casNumber: "67762-27-0",
    aliases: ["세틸스테아릴알코올"],
    safetyGrade: "SAFE",
    ewgScore: 1,
    commonAllergen: false,
    category: "emollient",
    functions: ["emollient", "emulsifier"],
  },
  {
    id: "ing_005",
    nameInci: "Panthenol",
    nameKo: "판테놀",
    nameEn: "Panthenol",
    casNumber: "81-13-0",
    aliases: ["D-Panthenol", "Provitamin B5", "덱스판테놀"],
    safetyGrade: "SAFE",
    ewgScore: 1,
    commonAllergen: false,
    category: "soothing",
    functions: ["soothing", "진정", "skin conditioning"],
  },
  {
    id: "ing_006",
    nameInci: "Centella Asiatica Extract",
    nameKo: "센텔라아시아티카추출물",
    nameEn: "Centella Asiatica Extract",
    casNumber: "84696-21-9",
    aliases: ["CICA", "시카", "병풀추출물"],
    safetyGrade: "SAFE",
    ewgScore: 1,
    commonAllergen: false,
    category: "soothing",
    functions: ["soothing", "진정", "anti-inflammatory"],
  },
  {
    id: "ing_007",
    nameInci: "Retinol",
    nameKo: "레티놀",
    nameEn: "Retinol",
    casNumber: "68-26-8",
    aliases: ["Vitamin A", "비타민A"],
    safetyGrade: "CAUTION",
    ewgScore: 5,
    commonAllergen: false,
    category: "anti-aging",
    functions: ["anti-aging", "안티에이징", "주름개선"],
  },
  {
    id: "ing_008",
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
    id: "ing_009",
    nameInci: "Methylisothiazolinone",
    nameKo: "메칠이소치아졸리논",
    nameEn: "Methylisothiazolinone",
    casNumber: "2682-20-4",
    aliases: ["MIT"],
    safetyGrade: "HAZARDOUS",
    ewgScore: 9,
    commonAllergen: true,
    category: "preservative",
    functions: ["preservative"],
  },
  {
    id: "ing_010",
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
    id: "ing_011",
    nameInci: "Ceramide NP",
    nameKo: "세라마이드엔피",
    nameEn: "Ceramide NP",
    casNumber: "100403-19-8",
    aliases: ["세라마이드", "Ceramide 3"],
    safetyGrade: "SAFE",
    ewgScore: 1,
    commonAllergen: false,
    category: "emollient",
    functions: ["moisturizer", "보습", "emollient", "occlusive"],
  },
  {
    id: "ing_012",
    nameInci: "Ascorbic Acid",
    nameKo: "아스코르빈산",
    nameEn: "Ascorbic Acid",
    casNumber: "50-81-7",
    aliases: ["Vitamin C", "비타민C", "L-Ascorbic Acid"],
    safetyGrade: "SAFE",
    ewgScore: 1,
    commonAllergen: false,
    category: "brightening",
    functions: ["brightening", "미백", "antioxidant", "vitamin c"],
  },
];

// ────────────────────────────────────────────────────────────
// 인생템 목업 (3개 제품)
// ────────────────────────────────────────────────────────────

function makeIng(
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

const D = MOCK_DICTIONARY;

export const MOCK_HOLY_GRAILS: HolyGrailInput[] = [
  {
    productName: "이니스프리 그린티 세럼",
    category: "SERUM",
    satisfactionScore: 5,
    ingredients: [
      makeIng(D[2], 1),  // Glycerin (#1)
      makeIng(D[1], 2),  // Hyaluronic Acid (#2)
      makeIng(D[0], 3),  // Niacinamide (#3)
      makeIng(D[4], 5),  // Panthenol (#5)
      makeIng(D[5], 8),  // Centella Asiatica (#8)
      makeIng(D[10], 12), // Ceramide NP (#12)
      makeIng(D[9], 18),  // Adenosine (#18)
    ],
  },
  {
    productName: "라운드랩 자작나무 수분크림",
    category: "CREAM",
    satisfactionScore: 4,
    ingredients: [
      makeIng(D[2], 1),  // Glycerin (#1)
      makeIng(D[1], 3),  // Hyaluronic Acid (#3)
      makeIng(D[3], 4),  // Cetearyl Alcohol (#4)
      makeIng(D[4], 6),  // Panthenol (#6)
      makeIng(D[0], 9),  // Niacinamide (#9)
      makeIng(D[10], 14), // Ceramide NP (#14)
      makeIng(D[7], 20),  // Fragrance (#20)
    ],
  },
  {
    productName: "코스알엑스 스네일 에센스",
    category: "SERUM",
    satisfactionScore: 5,
    ingredients: [
      makeIng(D[2], 1),  // Glycerin (#1)
      makeIng(D[1], 2),  // Hyaluronic Acid (#2)
      makeIng(D[0], 4),  // Niacinamide (#4)
      makeIng(D[5], 6),  // Centella Asiatica (#6)
      makeIng(D[4], 7),  // Panthenol (#7)
      makeIng(D[9], 15), // Adenosine (#15)
    ],
  },
];

// ────────────────────────────────────────────────────────────
// 비교 대상 제품 목업
// ────────────────────────────────────────────────────────────

/** 잘 맞는 제품 (선호 성분 다수 포함) */
export const MOCK_GOOD_PRODUCT = {
  productId: "prod_good",
  name: "닥터지 레드 블레미쉬 크림",
  category: "CREAM",
  ingredients: [
    makeIng(D[2], 1),   // Glycerin
    makeIng(D[1], 2),   // Hyaluronic Acid
    makeIng(D[0], 4),   // Niacinamide
    makeIng(D[4], 5),   // Panthenol
    makeIng(D[5], 7),   // Centella Asiatica
    makeIng(D[10], 10), // Ceramide NP
    makeIng(D[9], 16),  // Adenosine
  ],
};

/** 위험한 제품 (주의 성분 포함) */
export const MOCK_RISKY_PRODUCT = {
  productId: "prod_risky",
  name: "의심스러운 크림 X",
  category: "CREAM",
  ingredients: [
    makeIng(D[2], 1),  // Glycerin
    makeIng(D[8], 3),  // Methylisothiazolinone (HAZARDOUS!)
    makeIng(D[7], 5),  // Fragrance (allergen!)
    makeIng(D[6], 8),  // Retinol (CAUTION)
  ],
};

/** 완전히 다른 제품 (선호 성분 거의 없음) */
export const MOCK_MISMATCH_PRODUCT = {
  productId: "prod_mismatch",
  name: "전혀 다른 선크림",
  category: "SUNSCREEN",
  ingredients: [
    makeIng(D[3], 1),  // Cetearyl Alcohol
    makeIng(D[6], 5),  // Retinol
  ],
};

// ────────────────────────────────────────────────────────────
// CompareResult 목업 (통계 집계 테스트용)
// ────────────────────────────────────────────────────────────

export const MOCK_COMPARE_RESULTS = [
  {
    productId: "prod_001",
    productName: "제품 A",
    userId: "user_1",
    fitScore: 88,
    fitGrade: "PERFECT",
    matchedGoodIngredients: ["Glycerin", "Hyaluronic Acid"],
    matchedRiskIngredients: [],
    createdAt: new Date("2025-01-15"),
  },
  {
    productId: "prod_001",
    productName: "제품 A",
    userId: "user_2",
    fitScore: 75,
    fitGrade: "GOOD",
    matchedGoodIngredients: ["Glycerin"],
    matchedRiskIngredients: ["Fragrance"],
    createdAt: new Date("2025-01-16"),
  },
  {
    productId: "prod_001",
    productName: "제품 A",
    userId: "user_3",
    fitScore: 42,
    fitGrade: "POOR",
    matchedGoodIngredients: [],
    matchedRiskIngredients: ["Fragrance", "Retinol"],
    createdAt: new Date("2025-01-16"),
  },
  {
    productId: "prod_002",
    productName: "제품 B",
    userId: "user_1",
    fitScore: 92,
    fitGrade: "PERFECT",
    matchedGoodIngredients: ["Niacinamide", "Panthenol"],
    matchedRiskIngredients: [],
    createdAt: new Date("2025-01-17"),
  },
  {
    productId: "prod_002",
    productName: "제품 B",
    userId: "user_4",
    fitScore: 65,
    fitGrade: "FAIR",
    matchedGoodIngredients: ["Niacinamide"],
    matchedRiskIngredients: ["Retinol"],
    createdAt: new Date("2025-01-18"),
  },
];
