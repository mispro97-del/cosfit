// ============================================================
// COSFIT - FR-04: 개인 기준(User Standard) 생성 엔진
// ============================================================
// 최소 2개 인생템의 성분 데이터를 분석하여:
//   1. 공통 선호 성분 추출 (빈도 + 함량 순서 가중)
//   2. 주의 성분 감지 (EWG, 알러젠, 안전등급)
//   3. 성분 카테고리 패턴 도출 (보습, 미백, 항산화 등)
//   4. 사용자 이해용 요약 문장 생성
// ============================================================

import type {
  HolyGrailInput,
  IngredientWithOrder,
  PreferredIngredient,
  AvoidIngredient,
  ExcludedIngredient,
  DetectedPattern,
  UserStandardProfile,
  UserStandardExplain,
} from "./types";

// ────────────────────────────────────────────────────────────
// 성분 카테고리 → 패턴 매핑 사전
// ────────────────────────────────────────────────────────────

interface PatternDefinition {
  patternId: string;
  name: string;
  nameKo: string;
  description: string;
  /** 이 패턴을 트리거하는 성분 카테고리 또는 기능 키워드 */
  triggers: string[];
  /** 최소 매칭 성분 수 */
  minMatchCount: number;
}

const PATTERN_DEFINITIONS: PatternDefinition[] = [
  {
    patternId: "HYDRATION",
    name: "Hydration-Focused",
    nameKo: "보습 중심",
    description: "히알루론산, 세라마이드, 글리세린 등 보습 성분을 선호하는 패턴",
    triggers: ["humectant", "moisturizer", "보습", "emollient", "occlusive"],
    minMatchCount: 2,
  },
  {
    patternId: "BRIGHTENING",
    name: "Brightening-Focused",
    nameKo: "미백·톤업 중심",
    description: "나이아신아마이드, 비타민C 유도체 등 브라이트닝 성분을 선호하는 패턴",
    triggers: ["brightening", "미백", "whitening", "antioxidant", "vitamin c"],
    minMatchCount: 2,
  },
  {
    patternId: "ANTI_AGING",
    name: "Anti-Aging Focused",
    nameKo: "안티에이징 중심",
    description: "레티놀, 펩타이드, 아데노신 등 노화 방지 성분을 선호하는 패턴",
    triggers: ["anti-aging", "안티에이징", "주름개선", "peptide", "retinoid"],
    minMatchCount: 2,
  },
  {
    patternId: "SOOTHING",
    name: "Soothing-Focused",
    nameKo: "진정 중심",
    description: "판테놀, 센텔라, 알란토인 등 진정 성분을 선호하는 패턴",
    triggers: ["soothing", "진정", "anti-inflammatory", "calming", "sensitive"],
    minMatchCount: 2,
  },
  {
    patternId: "EXFOLIATING",
    name: "Exfoliation-Focused",
    nameKo: "각질 관리 중심",
    description: "AHA, BHA, PHA 등 각질 제거 성분을 선호하는 패턴",
    triggers: ["exfoliant", "각질", "aha", "bha", "pha", "peeling"],
    minMatchCount: 1,
  },
  {
    patternId: "MINIMAL",
    name: "Minimal Ingredients",
    nameKo: "저자극·심플 중심",
    description: "전체 성분 수가 적고 자극 성분을 회피하는 미니멀 루틴 패턴",
    triggers: [],
    minMatchCount: 0,
  },
];

// ────────────────────────────────────────────────────────────
// 알려진 자극 성분 목록 (공통 배제 성분 감지용)
// ────────────────────────────────────────────────────────────

interface KnownIrritant {
  nameInci: string;
  nameKo: string;
  irritantRisk: "HIGH" | "MEDIUM" | "LOW";
}

const KNOWN_IRRITANTS: KnownIrritant[] = [
  { nameInci: "formaldehyde",               nameKo: "포름알데히드",    irritantRisk: "HIGH" },
  { nameInci: "methylisothiazolinone",       nameKo: "MIT",             irritantRisk: "HIGH" },
  { nameInci: "methylchloroisothiazolinone", nameKo: "CMIT",            irritantRisk: "HIGH" },
  { nameInci: "sodium lauryl sulfate",       nameKo: "SLS",             irritantRisk: "HIGH" },
  { nameInci: "hydroquinone",                nameKo: "하이드로퀴논",    irritantRisk: "HIGH" },
  { nameInci: "fragrance",                   nameKo: "인공향료",        irritantRisk: "MEDIUM" },
  { nameInci: "parfum",                      nameKo: "향료",            irritantRisk: "MEDIUM" },
  { nameInci: "alcohol denat.",              nameKo: "변성알코올",      irritantRisk: "MEDIUM" },
  { nameInci: "isopropyl alcohol",           nameKo: "이소프로필알코올", irritantRisk: "MEDIUM" },
  { nameInci: "sodium laureth sulfate",      nameKo: "SLES",            irritantRisk: "MEDIUM" },
  { nameInci: "triclosan",                   nameKo: "트리클로산",      irritantRisk: "MEDIUM" },
  { nameInci: "oxybenzone",                  nameKo: "옥시벤존",        irritantRisk: "MEDIUM" },
  { nameInci: "propylparaben",               nameKo: "프로필파라벤",    irritantRisk: "LOW" },
  { nameInci: "linalool",                    nameKo: "리날룰",          irritantRisk: "LOW" },
  { nameInci: "limonene",                    nameKo: "리모넨",          irritantRisk: "LOW" },
];

// ────────────────────────────────────────────────────────────
// EWG / 안전등급 기반 리스크 판단 기준
// ────────────────────────────────────────────────────────────

const EWG_HIGH_RISK_THRESHOLD = 7;   // EWG 7 이상 → HIGH
const EWG_MEDIUM_RISK_THRESHOLD = 4; // EWG 4~6 → MEDIUM

const SAFETY_GRADE_RISK_MAP: Record<string, "HIGH" | "MEDIUM" | "LOW" | null> = {
  HAZARDOUS: "HIGH",
  CAUTION: "MEDIUM",
  MODERATE: "LOW",
  SAFE: null,
  UNKNOWN: null,
};

// ────────────────────────────────────────────────────────────
// 메인 생성 함수
// ────────────────────────────────────────────────────────────

export function generateUserStandard(
  holyGrails: HolyGrailInput[],
  userAllergies: string[] = []
): UserStandardProfile {
  // ── 입력 검증 ──
  if (holyGrails.length < 2) {
    throw new Error("USER_STANDARD_MIN_PRODUCTS: 최소 2개의 인생템이 필요합니다.");
  }

  const totalProducts = holyGrails.length;

  // ── Step 1: 전체 성분 풀 구축 ──
  const ingredientPool = buildIngredientPool(holyGrails);

  // ── Step 2: 선호 성분 추출 ──
  const preferred = extractPreferredIngredients(ingredientPool, totalProducts);

  // ── Step 3: 주의 성분 감지 ──
  const avoid = detectAvoidIngredients(ingredientPool, userAllergies);

  // ── Step 3.5: 공통 배제 성분 추출 ──
  const excluded = extractExcludedIngredients(ingredientPool, holyGrails, totalProducts);

  // ── Step 4: 패턴 도출 ──
  const patterns = detectPatterns(ingredientPool, holyGrails, totalProducts);

  // ── Step 5: 신뢰도 산출 ──
  const overallConfidence = calculateConfidence(holyGrails, preferred, ingredientPool);

  // ── Step 6: 요약 문장 ──
  const explain = generateExplain(preferred, avoid, patterns, totalProducts);

  return {
    preferredIngredients: preferred,
    avoidIngredients: avoid,
    excludedIngredients: excluded,
    detectedPatterns: patterns,
    overallConfidence,
    basedOnProductCount: totalProducts,
    explain,
  };
}

// ────────────────────────────────────────────────────────────
// Step 1: 성분 풀 구축
// ────────────────────────────────────────────────────────────

interface PoolEntry {
  ingredient: IngredientWithOrder;
  frequency: number;
  positions: number[];
  satisfactionScores: number[];
  productNames: string[];
}

function buildIngredientPool(holyGrails: HolyGrailInput[]): Map<string, PoolEntry> {
  const pool = new Map<string, PoolEntry>();

  for (const product of holyGrails) {
    for (const ing of product.ingredients) {
      const key = ing.ingredientId;
      const existing = pool.get(key);

      if (existing) {
        existing.frequency++;
        existing.positions.push(ing.orderIndex);
        existing.satisfactionScores.push(product.satisfactionScore);
        existing.productNames.push(product.productName);
        // 가장 완전한 데이터로 업데이트
        if (!existing.ingredient.safetyGrade && ing.safetyGrade) {
          existing.ingredient = { ...existing.ingredient, ...ing };
        }
      } else {
        pool.set(key, {
          ingredient: { ...ing },
          frequency: 1,
          positions: [ing.orderIndex],
          satisfactionScores: [product.satisfactionScore],
          productNames: [product.productName],
        });
      }
    }
  }

  return pool;
}

// ────────────────────────────────────────────────────────────
// Step 2: 선호 성분 추출
// ────────────────────────────────────────────────────────────

function extractPreferredIngredients(
  pool: Map<string, PoolEntry>,
  totalProducts: number
): PreferredIngredient[] {
  const candidates: PreferredIngredient[] = [];

  for (const [, entry] of pool) {
    // 2개 이상 제품에 공통 포함되어야 선호 성분 후보
    if (entry.frequency < 2) continue;

    const avgPosition =
      entry.positions.reduce((a, b) => a + b, 0) / entry.positions.length;

    const avgSatisfaction =
      entry.satisfactionScores.reduce((a, b) => a + b, 0) /
      entry.satisfactionScores.length;

    // 가중치 공식:
    //   W = (빈도/전체제품) × 위치보정 × 만족도보정
    //   위치보정: 상위 성분일수록 함량이 높으므로 가중치 ↑
    //   만족도보정: 만족도 높은 제품의 성분에 가중치 ↑
    const frequencyRatio = entry.frequency / totalProducts;
    const positionBoost = 1 / (1 + avgPosition * 0.05);
    const satisfactionBoost = avgSatisfaction / 5;
    const weight =
      Math.round(frequencyRatio * positionBoost * satisfactionBoost * 1000) / 1000;

    const productList = entry.productNames.join(", ");
    const positionDesc =
      avgPosition <= 5 ? "상위" : avgPosition <= 15 ? "중위" : "하위";

    candidates.push({
      ingredientId: entry.ingredient.ingredientId,
      nameInci: entry.ingredient.nameInci,
      nameKo: entry.ingredient.nameKo ?? null,
      weight,
      frequency: entry.frequency,
      avgPosition: Math.round(avgPosition * 10) / 10,
      reason:
        `${entry.frequency}/${totalProducts}개 인생템에 공통 포함 (${positionDesc} 함량, 평균 만족도 ${avgSatisfaction.toFixed(1)})`,
      functions: entry.ingredient.functions ?? [],
    });
  }

  // 가중치 내림차순 정렬, 상위 20개
  return candidates.sort((a, b) => b.weight - a.weight).slice(0, 20);
}

// ────────────────────────────────────────────────────────────
// Step 3: 주의 성분 감지
// ────────────────────────────────────────────────────────────

function detectAvoidIngredients(
  pool: Map<string, PoolEntry>,
  userAllergies: string[]
): AvoidIngredient[] {
  const avoidList: AvoidIngredient[] = [];
  const allergySet = new Set(userAllergies.map((a) => a.toLowerCase()));

  for (const [, entry] of pool) {
    const ing = entry.ingredient;

    // ① 사용자 지정 알러지 성분
    if (
      allergySet.has(ing.nameInci.toLowerCase()) ||
      (ing.nameKo && allergySet.has(ing.nameKo.toLowerCase()))
    ) {
      avoidList.push({
        ingredientId: ing.ingredientId,
        nameInci: ing.nameInci,
        nameKo: ing.nameKo ?? null,
        riskLevel: "HIGH",
        reason: "사용자 알러지 등록 성분",
        source: "USER_ALLERGY",
      });
      continue;
    }

    // ② 일반적 알러젠
    if (ing.commonAllergen) {
      avoidList.push({
        ingredientId: ing.ingredientId,
        nameInci: ing.nameInci,
        nameKo: ing.nameKo ?? null,
        riskLevel: "MEDIUM",
        reason: "일반적으로 알러지를 유발할 수 있는 성분",
        source: "ALLERGEN",
      });
      continue;
    }

    // ③ EWG 점수 기반
    if (ing.ewgScore != null) {
      if (ing.ewgScore >= EWG_HIGH_RISK_THRESHOLD) {
        avoidList.push({
          ingredientId: ing.ingredientId,
          nameInci: ing.nameInci,
          nameKo: ing.nameKo ?? null,
          riskLevel: "HIGH",
          reason: `EWG 위험 등급 ${ing.ewgScore}/10`,
          source: "EWG",
        });
        continue;
      }
      if (ing.ewgScore >= EWG_MEDIUM_RISK_THRESHOLD) {
        avoidList.push({
          ingredientId: ing.ingredientId,
          nameInci: ing.nameInci,
          nameKo: ing.nameKo ?? null,
          riskLevel: "MEDIUM",
          reason: `EWG 주의 등급 ${ing.ewgScore}/10`,
          source: "EWG",
        });
        continue;
      }
    }

    // ④ 안전 등급 기반
    if (ing.safetyGrade) {
      const riskLevel = SAFETY_GRADE_RISK_MAP[ing.safetyGrade];
      if (riskLevel) {
        avoidList.push({
          ingredientId: ing.ingredientId,
          nameInci: ing.nameInci,
          nameKo: ing.nameKo ?? null,
          riskLevel,
          reason: `안전 등급: ${ing.safetyGrade}`,
          source: "SAFETY_GRADE",
        });
      }
    }
  }

  // 리스크 레벨 순 정렬
  const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return avoidList.sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
}

// ────────────────────────────────────────────────────────────
// Step 3.5: 공통 배제 성분 추출
// 알려진 자극 성분 중 인생템에 하나도 포함되지 않은 것을 감지
// ────────────────────────────────────────────────────────────

function extractExcludedIngredients(
  pool: Map<string, PoolEntry>,
  holyGrails: HolyGrailInput[],
  totalProducts: number
): ExcludedIngredient[] {
  // 인생템 전체 성분 nameInci 집합 (소문자)
  const allNameIncis = new Set<string>();
  for (const [, entry] of pool) {
    allNameIncis.add(entry.ingredient.nameInci.toLowerCase());
  }

  // 각 인생템별 성분 집합 (출현 빈도 계산용)
  const productNameSets = holyGrails.map(
    (p) => new Set(p.ingredients.map((i) => i.nameInci.toLowerCase()))
  );

  const excluded: ExcludedIngredient[] = [];

  for (const irritant of KNOWN_IRRITANTS) {
    const key = irritant.nameInci.toLowerCase();

    // 각 인생템에서 이 성분이 빠져있는 횟수 계산
    const excludedFromCount = productNameSets.filter(
      (s) => !s.has(key)
    ).length;

    // 80% 이상 인생템에서 빠져있어야 의미 있음
    if (excludedFromCount / totalProducts < 0.8) continue;

    excluded.push({
      nameInci: irritant.nameInci,
      nameKo: irritant.nameKo,
      excludedFromCount,
      irritantRisk: irritant.irritantRisk,
    });
  }

  // HIGH → MEDIUM → LOW 순 정렬
  const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return excluded.sort((a, b) => riskOrder[a.irritantRisk] - riskOrder[b.irritantRisk]);
}

// ────────────────────────────────────────────────────────────
// Step 4: 패턴 도출
// ────────────────────────────────────────────────────────────

function detectPatterns(
  pool: Map<string, PoolEntry>,
  holyGrails: HolyGrailInput[],
  totalProducts: number
): DetectedPattern[] {
  const detected: DetectedPattern[] = [];

  for (const patternDef of PATTERN_DEFINITIONS) {
    // "MINIMAL" 패턴은 별도 로직
    if (patternDef.patternId === "MINIMAL") {
      const avgIngredientCount =
        holyGrails.reduce((sum, p) => sum + p.ingredients.length, 0) / totalProducts;
      if (avgIngredientCount <= 20) {
        detected.push({
          patternId: patternDef.patternId,
          name: patternDef.name,
          nameKo: patternDef.nameKo,
          description: patternDef.description,
          confidence: avgIngredientCount <= 15 ? 0.85 : 0.6,
          matchedIngredients: [],
        });
      }
      continue;
    }

    // 일반 패턴: trigger 키워드와 성분 기능/카테고리 매칭
    const matchedIngredients: string[] = [];

    for (const [, entry] of pool) {
      if (entry.frequency < 2) continue; // 공통 성분만

      const ing = entry.ingredient;
      const searchableText = [
        ing.category ?? "",
        ...(ing.functions ?? []),
      ]
        .join(" ")
        .toLowerCase();

      const isMatch = patternDef.triggers.some((trigger) =>
        searchableText.includes(trigger.toLowerCase())
      );

      if (isMatch) {
        matchedIngredients.push(ing.nameInci);
      }
    }

    if (matchedIngredients.length >= patternDef.minMatchCount) {
      const confidence = Math.min(
        0.95,
        0.5 + matchedIngredients.length * 0.15
      );
      detected.push({
        patternId: patternDef.patternId,
        name: patternDef.name,
        nameKo: patternDef.nameKo,
        description: patternDef.description,
        confidence: Math.round(confidence * 100) / 100,
        matchedIngredients,
      });
    }
  }

  return detected.sort((a, b) => b.confidence - a.confidence);
}

// ────────────────────────────────────────────────────────────
// Step 5: 전체 신뢰도
// ────────────────────────────────────────────────────────────

function calculateConfidence(
  holyGrails: HolyGrailInput[],
  preferred: PreferredIngredient[],
  pool: Map<string, PoolEntry>
): number {
  let score = 0;

  // 제품 수: 2개 = 0.5, 3개 = 0.7, 4개+ = 0.85
  if (holyGrails.length >= 4) score += 0.85;
  else if (holyGrails.length >= 3) score += 0.7;
  else score += 0.5;

  // 선호 성분 추출 수: 5개 이상이면 보너스
  if (preferred.length >= 5) score += 0.1;

  // 전체 성분 풀 크기 (데이터 충분성)
  if (pool.size >= 30) score += 0.05;

  return Math.min(1, Math.round(score * 100) / 100);
}

// ────────────────────────────────────────────────────────────
// Step 6: 사용자 이해용 요약 생성
// ────────────────────────────────────────────────────────────

function generateExplain(
  preferred: PreferredIngredient[],
  avoid: AvoidIngredient[],
  patterns: DetectedPattern[],
  totalProducts: number
): UserStandardExplain {
  // ── 헤드라인 ──
  const topPattern = patterns[0];
  const headline = topPattern
    ? `당신은 '${topPattern.nameKo}' 스킨케어를 선호하는 타입이에요!`
    : `${totalProducts}개 인생템을 분석해 나만의 뷰티 기준을 만들었어요!`;

  // ── 피부 요약 ──
  const skinSummary =
    `${totalProducts}개의 인생템에서 총 ${preferred.length}개의 선호 성분과 ${avoid.length}개의 주의 성분을 발견했어요.`;

  // ── 선호 성분 요약 ──
  const topPreferred = preferred.slice(0, 3);
  const preferredNames = topPreferred
    .map((p) => p.nameKo ?? p.nameInci)
    .join(", ");
  const preferredSummary =
    topPreferred.length > 0
      ? `특히 ${preferredNames} 성분이 인생템에 공통으로 포함되어 있어, 이 성분들이 당신의 피부에 잘 맞는 핵심 성분이에요.`
      : "공통 선호 성분을 도출하기 위해 더 많은 인생템을 등록해보세요.";

  // ── 주의 성분 요약 ──
  const highRisks = avoid.filter((a) => a.riskLevel === "HIGH");
  const avoidSummary =
    highRisks.length > 0
      ? `${highRisks.map((a) => a.nameKo ?? a.nameInci).join(", ")} 성분은 주의가 필요해요. 새 제품 선택 시 확인해보세요.`
      : "심각한 주의 성분은 발견되지 않았어요. 안심하고 제품을 선택하세요!";

  // ── 패턴 요약 ──
  const patternNames = patterns.map((p) => p.nameKo).join(", ");
  const patternSummary =
    patterns.length > 0
      ? `당신의 스킨케어 패턴: ${patternNames}. 이 패턴에 맞는 제품을 추천받아보세요.`
      : "아직 뚜렷한 스킨케어 패턴이 감지되지 않았어요.";

  // ── 팁 ──
  const tips: string[] = [];
  if (totalProducts < 3) {
    tips.push("인생템을 1개 더 등록하면 분석 정확도가 크게 올라가요!");
  }
  if (patterns.length > 0 && topPattern) {
    tips.push(
      `'${topPattern.nameKo}' 패턴에 맞는 신제품을 검색해보세요.`
    );
  }
  if (highRisks.length > 0) {
    tips.push("주의 성분이 포함된 제품은 패치 테스트 후 사용을 권장해요.");
  }
  if (tips.length === 0) {
    tips.push("FIT Score로 새로운 제품의 적합도를 확인해보세요!");
  }

  return {
    headline,
    skinSummary,
    preferredSummary,
    avoidSummary,
    patternSummary,
    tips,
  };
}
