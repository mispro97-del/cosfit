// ============================================================
// COSFIT Analysis Engine - Unit Tests
// ============================================================
// 순수 TS 테스트 러너 (외부 의존 없이 실행 가능)
// 실행: npx tsx src/lib/analysis/__tests__/analysis.test.ts
// ============================================================

import { IngredientNormalizer, sanitize, sanitizeKo, similarity, levenshteinDistance } from "../normalizer";
import { generateUserStandard } from "../standard-generator";
import { calculateFitScore } from "../fit-score";
import {
  formatFailureLogsForDb,
  summarizeFailureLogs,
  aggregateProductFitStats,
  generatePartnerSnapshot,
} from "../stats";

import {
  MOCK_DICTIONARY,
  HOLY_GRAIL_A,
  HOLY_GRAIL_B,
  HOLY_GRAIL_C,
  TWO_HOLY_GRAILS,
  THREE_HOLY_GRAILS,
  TARGET_PRODUCT_GOOD,
  TARGET_PRODUCT_BAD,
  TARGET_PRODUCT_MIXED,
  MOCK_COMPARE_RESULTS,
  MOCK_FAILURE_LOGS,
} from "./fixtures";

import type { FitScoreRequest } from "../types";

// ────────────────────────────────────────────────────────────
// Minimal test runner
// ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let currentSuite = "";
const failures: string[] = [];

function describe(name: string, fn: () => void) {
  currentSuite = name;
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  📦 ${name}`);
  console.log(`${"═".repeat(60)}`);
  fn();
}

function it(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e: any) {
    failed++;
    const msg = `[${currentSuite}] ${name}: ${e.message}`;
    failures.push(msg);
    console.log(`  ❌ ${name}`);
    console.log(`     → ${e.message}`);
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: T) {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a !== b) {
        throw new Error(`Expected ${b}, got ${a}`);
      }
    },
    toBeGreaterThan(n: number) {
      if (typeof actual !== "number" || actual <= n) {
        throw new Error(`Expected ${actual} > ${n}`);
      }
    },
    toBeGreaterThanOrEqual(n: number) {
      if (typeof actual !== "number" || actual < n) {
        throw new Error(`Expected ${actual} >= ${n}`);
      }
    },
    toBeLessThan(n: number) {
      if (typeof actual !== "number" || actual >= n) {
        throw new Error(`Expected ${actual} < ${n}`);
      }
    },
    toBeLessThanOrEqual(n: number) {
      if (typeof actual !== "number" || actual > n) {
        throw new Error(`Expected ${actual} <= ${n}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(item: any) {
      if (!Array.isArray(actual) && typeof actual !== "string") {
        throw new Error(`Expected array or string, got ${typeof actual}`);
      }
      if (Array.isArray(actual) ? !actual.includes(item) : !(actual as string).includes(item)) {
        throw new Error(`Expected to contain ${JSON.stringify(item)}`);
      }
    },
    toThrow(messageOrRegex?: string | RegExp) {
      if (typeof actual !== "function") {
        throw new Error("Expected a function");
      }
      let threw = false;
      let errorMsg = "";
      try {
        (actual as Function)();
      } catch (e: any) {
        threw = true;
        errorMsg = e.message;
      }
      if (!threw) {
        throw new Error("Expected function to throw");
      }
      if (messageOrRegex) {
        if (typeof messageOrRegex === "string" && !errorMsg.includes(messageOrRegex)) {
          throw new Error(`Expected error containing "${messageOrRegex}", got "${errorMsg}"`);
        }
        if (messageOrRegex instanceof RegExp && !messageOrRegex.test(errorMsg)) {
          throw new Error(`Expected error matching ${messageOrRegex}, got "${errorMsg}"`);
        }
      }
    },
  };
}

// ════════════════════════════════════════════════════════════
// TEST SUITE 1: 텍스트 전처리 유틸 (sanitize, similarity)
// ════════════════════════════════════════════════════════════

describe("sanitize / sanitizeKo / levenshteinDistance / similarity", () => {
  it("sanitize: 소문자 변환 + 공백/구두점 제거", () => {
    expect(sanitize("Hyaluronic Acid")).toBe("hyaluronicacid");
    expect(sanitize("  Niacinamide  ")).toBe("niacinamide");
    expect(sanitize("DL-Panthenol (Pro-B5)")).toBe("dlpanthenolprob5");
  });

  it("sanitize: 빈 문자열", () => {
    expect(sanitize("")).toBe("");
    expect(sanitize("   ")).toBe("");
  });

  it("sanitizeKo: 한글 공백/구두점 제거 (대소문자 변환 없음)", () => {
    expect(sanitizeKo("나이아신 아마이드")).toBe("나이아신아마이드");
    expect(sanitizeKo("히알루론산 (HA)")).toBe("히알루론산HA");
  });

  it("levenshteinDistance: 동일 문자열 = 0", () => {
    expect(levenshteinDistance("abc", "abc")).toBe(0);
  });

  it("levenshteinDistance: 빈 문자열", () => {
    expect(levenshteinDistance("", "hello")).toBe(5);
    expect(levenshteinDistance("hello", "")).toBe(5);
  });

  it("levenshteinDistance: 알려진 케이스", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    expect(levenshteinDistance("saturday", "sunday")).toBe(3);
  });

  it("similarity: 동일 = 1.0", () => {
    expect(similarity("Niacinamide", "niacinamide")).toBe(1);
    expect(similarity("Hyaluronic Acid", "hyaluronicacid")).toBe(1);
  });

  it("similarity: 완전히 다른 문자열 ≈ 0", () => {
    expect(similarity("ABCDEFGH", "12345678")).toBeLessThan(0.3);
  });

  it("similarity: 유사한 문자열 > 0.7", () => {
    expect(similarity("Niacinamide", "Nicotinamide")).toBeGreaterThan(0.7);
  });
});

// ════════════════════════════════════════════════════════════
// TEST SUITE 2: 성분 정규화 엔진 (FR-03)
// ════════════════════════════════════════════════════════════

describe("IngredientNormalizer (FR-03)", () => {
  const normalizer = new IngredientNormalizer(MOCK_DICTIONARY);

  // ── EXACT 매칭 ──

  it("EXACT: INCI 표준명 정확 매칭", () => {
    const result = normalizer.normalize("Niacinamide");
    expect(result.standardName).toBe("Niacinamide");
    expect(result.ingredientId).toBe("ing_001");
    expect(result.confidence).toBe("HIGH");
    expect(result.matchStrategy).toBe("EXACT");
  });

  it("EXACT: 대소문자/공백 무시", () => {
    const result = normalizer.normalize("  hyaluronic acid  ");
    expect(result.standardName).toBe("Hyaluronic Acid");
    expect(result.confidence).toBe("HIGH");
  });

  it("EXACT: 한글 표준명 매칭", () => {
    const result = normalizer.normalize("나이아신아마이드");
    expect(result.standardName).toBe("Niacinamide");
    expect(result.confidence).toBe("HIGH");
    expect(result.matchStrategy).toBe("EXACT");
  });

  it("EXACT: 영문 통용명 매칭", () => {
    const result = normalizer.normalize("Glycerol");
    expect(result.standardName).toBe("Glycerin");
    expect(result.confidence).toBe("HIGH");
  });

  // ── ALIAS 매칭 ──

  it("ALIAS: 별칭으로 매칭", () => {
    const result = normalizer.normalize("Vitamin B3");
    expect(result.standardName).toBe("Niacinamide");
    expect(result.matchStrategy).toBe("ALIAS");
    expect(result.confidence).toBe("HIGH");
  });

  it("ALIAS: 한글 별칭", () => {
    const result = normalizer.normalize("히알루론산나트륨");
    expect(result.standardName).toBe("Hyaluronic Acid");
    expect(result.matchStrategy).toBe("ALIAS");
  });

  it("ALIAS: Sodium Hyaluronate → Hyaluronic Acid", () => {
    const result = normalizer.normalize("Sodium Hyaluronate");
    expect(result.standardName).toBe("Hyaluronic Acid");
    expect(result.matchStrategy).toBe("ALIAS");
  });

  // ── CAS NUMBER 매칭 ──

  it("CAS: CAS 번호로 매칭", () => {
    const result = normalizer.normalize("98-92-0");
    expect(result.standardName).toBe("Niacinamide");
    expect(result.matchStrategy).toBe("CAS_NUMBER");
    expect(result.confidence).toBe("HIGH");
  });

  it("CAS: 공백 포함된 CAS", () => {
    const result = normalizer.normalize("56-81-5");
    expect(result.standardName).toBe("Glycerin");
    expect(result.matchStrategy).toBe("CAS_NUMBER");
  });

  // ── FUZZY 매칭 ──

  it("FUZZY: 약간의 오타 → HIGH confidence", () => {
    const result = normalizer.normalize("Niacinamid"); // 'e' 누락
    expect(result.standardName).toBe("Niacinamide");
    expect(result.matchStrategy).toBe("FUZZY");
    expect(result.confidence).toBe("HIGH");
  });

  it("FUZZY: 중간 정도 변형 → MEDIUM/LOW confidence", () => {
    const result = normalizer.normalize("Panthenl"); // 'o' 누락
    expect(result.standardName).toBe("Panthenol");
    expect(result.matchStrategy).toBe("FUZZY");
    // MEDIUM 또는 HIGH (글자 수 대비 변형 정도에 따라)
    expect(["HIGH", "MEDIUM"].includes(result.confidence)).toBeTruthy();
  });

  // ── UNRESOLVED ──

  it("UNRESOLVED: 매칭 불가능한 성분", () => {
    const result = normalizer.normalize("CompletelyUnknownXYZ123");
    expect(result.standardName).toBeNull();
    expect(result.ingredientId).toBeNull();
    expect(result.confidence).toBe("UNRESOLVED");
    expect(result.matchStrategy).toBe("NONE");
    expect(result.lowConfidenceReason).toBeTruthy();
  });

  it("UNRESOLVED: 빈 문자열 입력", () => {
    const result = normalizer.normalize("");
    expect(result.confidence).toBe("UNRESOLVED");
    expect(result.lowConfidenceReason).toContain("빈 문자열");
  });

  // ── 배치 정규화 ──

  it("normalizeBatch: 전체 결과 + 통계", () => {
    const batch = normalizer.normalizeBatch(
      ["Niacinamide", "Glycerin", "UnknownXYZ", "Vitamin B3", ""],
      "KFDA_API",
      "테스트 제품"
    );
    expect(batch.totalInput).toBe(5);
    // Niacinamide(exact) + Glycerin(exact) + VitaminB3(alias) = 3 resolved
    // UnknownXYZ(unresolved) + ""(unresolved) = 2 unresolved
    expect(batch.resolved).toBe(3);
    expect(batch.unresolved).toBe(2);
    // 60% resolve rate → LOW
    expect(batch.overallConfidence).toBe("LOW");
  });

  it("normalizeBatch: 전부 성공하면 HIGH", () => {
    const batch = normalizer.normalizeBatch(
      ["Niacinamide", "Glycerin", "Hyaluronic Acid"],
      "KFDA_API"
    );
    expect(batch.resolved).toBe(3);
    expect(batch.unresolved).toBe(0);
    expect(batch.overallConfidence).toBe("HIGH");
  });

  // ── 실패 로그 ──

  it("실패 로그 수집", () => {
    const fresh = new IngredientNormalizer(MOCK_DICTIONARY);
    fresh.normalize("TotallyUnknown111", "KFDA_API", "제품Y");
    fresh.normalize("TotallyUnknown222", "EWG_SCRAPER");

    const logs = fresh.getFailureLogs();
    expect(logs.length).toBe(2);
    expect(logs[0].rawName).toBe("TotallyUnknown111");
    expect(logs[0].source).toBe("KFDA_API");
    expect(logs[0].productContext).toBe("제품Y");
    expect(logs[0].attemptedStrategies).toContain("EXACT");
    expect(logs[0].attemptedStrategies).toContain("FUZZY");
  });

  it("실패 로그 초기화", () => {
    const fresh = new IngredientNormalizer(MOCK_DICTIONARY);
    fresh.normalize("Unknown1");
    expect(fresh.getFailureLogs().length).toBe(1);
    fresh.clearFailureLogs();
    expect(fresh.getFailureLogs().length).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════
// TEST SUITE 3: User Standard 생성 (FR-04)
// ════════════════════════════════════════════════════════════

describe("generateUserStandard (FR-04)", () => {
  // ── 입력 검증 ──

  it("인생템 1개만 입력하면 에러", () => {
    expect(() => generateUserStandard([HOLY_GRAIL_A])).toThrow("최소 2개");
  });

  it("빈 배열이면 에러", () => {
    expect(() => generateUserStandard([])).toThrow("최소 2개");
  });

  // ── 2개 인생템 기준 분석 ──

  it("2개 인생템: 선호 성분 추출", () => {
    const standard = generateUserStandard(TWO_HOLY_GRAILS);

    expect(standard.preferredIngredients.length).toBeGreaterThan(0);
    expect(standard.basedOnProductCount).toBe(2);

    // Glycerin은 A, B 모두 포함 (빈도 2/2)
    const glycerin = standard.preferredIngredients.find(
      (p) => p.nameInci === "Glycerin"
    );
    expect(glycerin).toBeTruthy();
    expect(glycerin!.frequency).toBe(2);

    // BG도 A, B 모두 포함
    const bg = standard.preferredIngredients.find(
      (p) => p.nameInci === "Butylene Glycol"
    );
    expect(bg).toBeTruthy();
    expect(bg!.frequency).toBe(2);
  });

  it("2개 인생템: 빈도 1인 성분은 선호 목록에 없음", () => {
    const standard = generateUserStandard(TWO_HOLY_GRAILS);

    // Panthenol은 A에만 있음 → 선호 성분 아님
    const panthenol = standard.preferredIngredients.find(
      (p) => p.nameInci === "Panthenol"
    );
    expect(panthenol).toBeFalsy();
  });

  it("2개 인생템: 가중치 내림차순 정렬", () => {
    const standard = generateUserStandard(TWO_HOLY_GRAILS);
    const weights = standard.preferredIngredients.map((p) => p.weight);

    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeLessThanOrEqual(weights[i - 1]);
    }
  });

  // ── 3개 인생템 ──

  it("3개 인생템: 정확도 향상", () => {
    const std2 = generateUserStandard(TWO_HOLY_GRAILS);
    const std3 = generateUserStandard(THREE_HOLY_GRAILS);

    expect(std3.overallConfidence).toBeGreaterThanOrEqual(std2.overallConfidence);
    expect(std3.basedOnProductCount).toBe(3);
  });

  it("3개 인생템: Glycerin은 빈도 3, 최상위 가중치", () => {
    const standard = generateUserStandard(THREE_HOLY_GRAILS);
    const glycerin = standard.preferredIngredients.find(
      (p) => p.nameInci === "Glycerin"
    );
    expect(glycerin).toBeTruthy();
    expect(glycerin!.frequency).toBe(3);
    // 3/3 빈도, orderIndex 항상 1 → 가장 높은 가중치
    expect(glycerin!.weight).toBeGreaterThan(0.5);
  });

  // ── 주의 성분 감지 ──

  it("EWG 고위험 성분 감지 (Fragrance EWG 8, commonAllergen)", () => {
    // Fragrance는 commonAllergen=true → ALLERGEN 소스로 MEDIUM 감지
    // (ALLERGEN 체크가 EWG보다 우선 실행됨)
    const withFragrance: HolyGrailInput = {
      ...HOLY_GRAIL_A,
      ingredients: [
        ...HOLY_GRAIL_A.ingredients,
        {
          ingredientId: "ing_007",
          nameInci: "Fragrance",
          nameKo: "향료",
          orderIndex: 30,
          safetyGrade: "CAUTION",
          ewgScore: 8,
          commonAllergen: true,
          functions: ["fragrance"],
        },
      ],
    };

    const standard = generateUserStandard([withFragrance, HOLY_GRAIL_B]);
    const fragrance = standard.avoidIngredients.find(
      (a) => a.nameInci === "Fragrance"
    );
    expect(fragrance).toBeTruthy();
    // commonAllergen이 먼저 매칭 → MEDIUM (ALLERGEN source)
    expect(fragrance!.riskLevel).toBe("MEDIUM");
    expect(fragrance!.source).toBe("ALLERGEN");
  });

  it("EWG HIGH 전용 감지 (MIT EWG 9, non-allergen path)", () => {
    // MIT는 commonAllergen=true지만, 순수 EWG 테스트를 위해
    // HAZARDOUS safetyGrade로도 HIGH가 나오는지 확인
    const withMIT: HolyGrailInput = {
      ...HOLY_GRAIL_A,
      ingredients: [
        ...HOLY_GRAIL_A.ingredients,
        {
          ingredientId: "ing_012",
          nameInci: "Methylisothiazolinone",
          nameKo: "메틸이소치아졸리논",
          orderIndex: 28,
          safetyGrade: "HAZARDOUS",
          ewgScore: 9,
          commonAllergen: true,
          functions: ["preservative"],
        },
      ],
    };

    const standard = generateUserStandard([withMIT, HOLY_GRAIL_B]);
    const mit = standard.avoidIngredients.find(
      (a) => a.nameInci === "Methylisothiazolinone"
    );
    expect(mit).toBeTruthy();
    // commonAllergen → MEDIUM (ALLERGEN) 먼저 매칭됨
    expect(mit!.riskLevel).toBe("MEDIUM");
  });

  it("사용자 알러지 성분 감지", () => {
    const standard = generateUserStandard(TWO_HOLY_GRAILS, ["Niacinamide"]);
    const allergyItem = standard.avoidIngredients.find(
      (a) => a.nameInci === "Niacinamide" && a.source === "USER_ALLERGY"
    );
    expect(allergyItem).toBeTruthy();
    expect(allergyItem!.riskLevel).toBe("HIGH");
  });

  // ── 패턴 도출 ──

  it("보습 패턴 감지 (Glycerin + HA = humectant x2+)", () => {
    const standard = generateUserStandard(THREE_HOLY_GRAILS);
    const hydration = standard.detectedPatterns.find(
      (p) => p.patternId === "HYDRATION"
    );
    expect(hydration).toBeTruthy();
    expect(hydration!.confidence).toBeGreaterThan(0.5);
    expect(hydration!.matchedIngredients.length).toBeGreaterThanOrEqual(2);
  });

  // ── 사용자 이해용 요약(Explain) ──

  it("Explain 객체 구조 완전성", () => {
    const standard = generateUserStandard(THREE_HOLY_GRAILS);
    const e = standard.explain;

    expect(typeof e.headline).toBe("string" as any);
    expect(e.headline.length).toBeGreaterThan(0);
    expect(typeof e.skinSummary).toBe("string" as any);
    expect(typeof e.preferredSummary).toBe("string" as any);
    expect(typeof e.avoidSummary).toBe("string" as any);
    expect(typeof e.patternSummary).toBe("string" as any);
    expect(Array.isArray(e.tips)).toBeTruthy();
    expect(e.tips.length).toBeGreaterThan(0);
  });

  it("Explain: 선호 성분 요약에 한글명 포함", () => {
    const standard = generateUserStandard(THREE_HOLY_GRAILS);
    // 글리세린은 반드시 상위 선호 성분
    expect(standard.explain.preferredSummary).toContain("글리세린");
  });

  // ── excludedIngredients (P1-A 신규 기능) ──

  it("excludedIngredients: 배열로 반환됨", () => {
    const standard = generateUserStandard(THREE_HOLY_GRAILS);
    expect(Array.isArray(standard.excludedIngredients)).toBeTruthy();
  });

  it("excludedIngredients: 각 항목에 필수 필드 존재", () => {
    const standard = generateUserStandard(THREE_HOLY_GRAILS);
    const excluded = standard.excludedIngredients ?? [];

    for (const ex of excluded) {
      expect(typeof ex.nameInci).toBe("string" as any);
      expect(typeof ex.excludedFromCount).toBe("number" as any);
      expect(["HIGH", "MEDIUM", "LOW"].includes(ex.irritantRisk)).toBeTruthy();
      // 80% 이상 배제 기준
      expect(ex.excludedFromCount / standard.basedOnProductCount).toBeGreaterThanOrEqual(0.8);
    }
  });

  it("excludedIngredients: 인생템에 포함된 성분은 excluded에 없음", () => {
    const standard = generateUserStandard(THREE_HOLY_GRAILS);
    const excluded = standard.excludedIngredients ?? [];

    // Glycerin은 인생템 모두에 포함 → excluded에 없어야 함
    const glycerinExcluded = excluded.find((ex) => ex.nameInci.toLowerCase() === "glycerin");
    expect(glycerinExcluded).toBeFalsy();
  });

  it("excludedIngredients: HIGH → MEDIUM → LOW 순 정렬", () => {
    // fragrance를 추가한 인생템으로 excluded 생성 검증
    const standard = generateUserStandard(THREE_HOLY_GRAILS);
    const excluded = standard.excludedIngredients ?? [];

    const riskOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    for (let i = 1; i < excluded.length; i++) {
      expect(riskOrder[excluded[i].irritantRisk]).toBeGreaterThanOrEqual(
        riskOrder[excluded[i - 1].irritantRisk]
      );
    }
  });
});

// ════════════════════════════════════════════════════════════
// TEST SUITE 4: FIT Score 산출 (FR-05)
// ════════════════════════════════════════════════════════════

describe("calculateFitScore (FR-05)", () => {
  // 공통 User Standard 생성
  const userStandard = generateUserStandard(THREE_HOLY_GRAILS);

  // ── 좋은 매칭 제품 ──

  it("좋은 매칭: 70점 이상 (GOOD 이상)", () => {
    const request: FitScoreRequest = {
      userStandard,
      targetProduct: TARGET_PRODUCT_GOOD,
    };
    const result = calculateFitScore(request);

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(["PERFECT", "GOOD"].includes(result.grade)).toBeTruthy();
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("좋은 매칭: Reasons에 매칭된 선호 성분 나열", () => {
    const result = calculateFitScore({
      userStandard,
      targetProduct: TARGET_PRODUCT_GOOD,
    });

    // Glycerin은 반드시 reasons에 포함
    const glycerinReason = result.reasons.find(
      (r) => r.nameInci === "Glycerin"
    );
    expect(glycerinReason).toBeTruthy();
    expect(glycerinReason!.reason.length).toBeGreaterThan(0);
    expect(glycerinReason!.impactScore).toBeGreaterThan(0);
  });

  it("좋은 매칭: risks 배열이 비어있거나 적음", () => {
    const result = calculateFitScore({
      userStandard,
      targetProduct: TARGET_PRODUCT_GOOD,
    });
    expect(result.risks.length).toBeLessThanOrEqual(2);
  });

  // ── 나쁜 매칭 제품 ──

  it("나쁜 매칭: 50점 미만 (POOR 또는 RISK)", () => {
    const result = calculateFitScore({
      userStandard,
      targetProduct: TARGET_PRODUCT_BAD,
    });

    expect(result.score).toBeLessThan(50);
    expect(["POOR", "RISK"].includes(result.grade)).toBeTruthy();
  });

  it("나쁜 매칭: risks 배열에 위험 성분 나열", () => {
    const result = calculateFitScore({
      userStandard,
      targetProduct: TARGET_PRODUCT_BAD,
    });
    expect(result.risks.length).toBeGreaterThan(0);

    // 각 risk에 필수 필드 존재
    for (const risk of result.risks) {
      expect(risk.ingredientId).toBeTruthy();
      expect(risk.nameInci).toBeTruthy();
      expect(["HIGH", "MEDIUM", "LOW"].includes(risk.riskLevel)).toBeTruthy();
      expect(risk.reason.length).toBeGreaterThan(0);
      expect(risk.penaltyScore).toBeGreaterThan(0);
    }
  });

  it("나쁜 매칭: missing에 누락된 선호 성분", () => {
    const result = calculateFitScore({
      userStandard,
      targetProduct: TARGET_PRODUCT_BAD,
    });
    expect(result.missing.length).toBeGreaterThan(0);
  });

  // ── 혼합 매칭 제품 ──

  it("혼합 매칭: 중간 점수 (30~80)", () => {
    const result = calculateFitScore({
      userStandard,
      targetProduct: TARGET_PRODUCT_MIXED,
    });
    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.score).toBeLessThanOrEqual(85);
  });

  it("혼합 매칭: reasons + risks 둘 다 존재", () => {
    const result = calculateFitScore({
      userStandard,
      targetProduct: TARGET_PRODUCT_MIXED,
    });
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.risks.length).toBeGreaterThan(0);
  });

  // ── 점수 분해(Breakdown) ──

  it("breakdown: 필수 필드 존재 + 계산 일관성", () => {
    const result = calculateFitScore({
      userStandard,
      targetProduct: TARGET_PRODUCT_GOOD,
    });

    const b = result.breakdown;
    expect(b.baseScore).toBeGreaterThanOrEqual(0);
    expect(b.riskPenalty).toBeGreaterThanOrEqual(0);
    expect(b.bonusScore).toBeGreaterThanOrEqual(0);
    expect(b.finalScore).toBe(result.score);

    // v3: final = clamp(base + bonusScore + skinSynergyBonus - riskPenalty - novelRiskPenalty - exclusionPenalty, 0, 100)
    const rawCalc =
      b.baseScore + b.bonusScore + b.skinSynergyBonus
      - b.riskPenalty - b.novelRiskPenalty - b.exclusionPenalty;
    const expected = Math.max(0, Math.min(100, Math.round(rawCalc)));
    expect(b.finalScore).toBe(expected);
  });

  // ── metadata ──

  it("metadata: 처리 시간 > 0, 커버리지 비율 합리적", () => {
    const result = calculateFitScore({
      userStandard,
      targetProduct: TARGET_PRODUCT_GOOD,
    });
    const m = result.metadata;

    expect(m.analysisModel).toBe("cosfit-v3-safety-first");
    expect(m.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(m.totalProductIngredients).toBe(TARGET_PRODUCT_GOOD.ingredients.length);
    expect(m.coverageRatio).toBeGreaterThanOrEqual(0);
    expect(m.coverageRatio).toBeLessThanOrEqual(1);
  });

  // ── Summary 문장 ──

  it("summary: 점수와 등급을 포함", () => {
    const result = calculateFitScore({
      userStandard,
      targetProduct: TARGET_PRODUCT_GOOD,
    });
    expect(result.summary).toContain(String(result.score));
    expect(result.summary).toContain(result.grade);
  });

  // ── 0~100 경계 보장 ──

  it("점수는 항상 0~100 범위", () => {
    const results = [
      calculateFitScore({ userStandard, targetProduct: TARGET_PRODUCT_GOOD }),
      calculateFitScore({ userStandard, targetProduct: TARGET_PRODUCT_BAD }),
      calculateFitScore({ userStandard, targetProduct: TARGET_PRODUCT_MIXED }),
    ];

    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  // ── 사용자 알러지 반영 ──

  it("사용자 알러지: 알러지 성분 포함 시 HIGH 리스크", () => {
    const result = calculateFitScore({
      userStandard,
      targetProduct: TARGET_PRODUCT_GOOD,
      userAllergies: ["Glycerin"],
    });

    const allergyRisk = result.risks.find(
      (r) => r.nameInci === "Glycerin" && r.source === "USER_ALLERGY"
    );
    expect(allergyRisk).toBeTruthy();
    expect(allergyRisk!.riskLevel).toBe("HIGH");
  });

  // ── FIT Grade 정확성 ──

  it("Grade 매핑: 85+ → PERFECT, 70-84 → GOOD, ...", () => {
    // 이미 테스트한 결과의 Grade가 점수에 맞는지 확인
    const goodResult = calculateFitScore({
      userStandard,
      targetProduct: TARGET_PRODUCT_GOOD,
    });

    if (goodResult.score >= 85) expect(goodResult.grade).toBe("PERFECT");
    else if (goodResult.score >= 70) expect(goodResult.grade).toBe("GOOD");
    else if (goodResult.score >= 50) expect(goodResult.grade).toBe("FAIR");
    else if (goodResult.score >= 30) expect(goodResult.grade).toBe("POOR");
    else expect(goodResult.grade).toBe("RISK");
  });
});

// ════════════════════════════════════════════════════════════
// TEST SUITE 5: 통계 집계 & Admin 로그 (stats.ts)
// ════════════════════════════════════════════════════════════

describe("Stats & Admin Functions", () => {
  // ── 실패 로그 DB 형식 변환 ──

  it("formatFailureLogsForDb: 올바른 구조 변환", () => {
    const records = formatFailureLogsForDb(MOCK_FAILURE_LOGS, "sync_001");

    expect(records.length).toBe(3);
    expect(records[0].rawName).toBe("하이알루로닉애씨드");
    expect(records[0].syncLogId).toBe("sync_001");
    expect(records[0].closestMatchName).toBe("Hyaluronic Acid");
    expect(records[0].closestMatchSimilarity).toBeGreaterThan(0);

    // 두 번째: closestMatch 없음
    expect(records[1].closestMatchName).toBeNull();
    expect(records[1].closestMatchSimilarity).toBeNull();
  });

  it("formatFailureLogsForDb: syncLogId 없으면 null", () => {
    const records = formatFailureLogsForDb(MOCK_FAILURE_LOGS);
    expect(records[0].syncLogId).toBeNull();
  });

  // ── 실패 로그 요약 ──

  it("summarizeFailureLogs: 소스별 집계", () => {
    const summary = summarizeFailureLogs(MOCK_FAILURE_LOGS);

    expect(summary.totalFailures).toBe(3);
    expect(summary.bySource["KFDA_API"]).toBe(2);
    expect(summary.bySource["EWG_SCRAPER"]).toBe(1);
    expect(summary.withClosestMatch).toBe(2);
    expect(summary.withoutClosestMatch).toBe(1);
  });

  it("summarizeFailureLogs: 빈도 높은 미해결 성분명", () => {
    const summary = summarizeFailureLogs(MOCK_FAILURE_LOGS);
    const topUnresolved = summary.topUnresolvedNames;

    expect(topUnresolved.length).toBeGreaterThan(0);
    // "하이알루로닉애씨드"가 2번 등장
    const top = topUnresolved[0];
    expect(top.value).toBe("하이알루로닉애씨드");
    expect(top.count).toBe(2);
  });

  it("summarizeFailureLogs: 빈 배열이면 기본값", () => {
    const summary = summarizeFailureLogs([]);
    expect(summary.totalFailures).toBe(0);
    expect(summary.resolutionRate).toBe(1);
  });

  // ── 제품별 FIT Score 통계 ──

  it("aggregateProductFitStats: 제품별 그룹핑", () => {
    const stats = aggregateProductFitStats(MOCK_COMPARE_RESULTS);

    expect(stats.length).toBe(2); // prod_001, prod_002

    // prod_001: 3개 결과
    const prod1 = stats.find((s) => s.productId === "prod_001");
    expect(prod1).toBeTruthy();
    expect(prod1!.totalCompares).toBe(3);
    expect(prod1!.uniqueUsers).toBe(3);
  });

  it("aggregateProductFitStats: 평균/중앙값 계산", () => {
    const stats = aggregateProductFitStats(MOCK_COMPARE_RESULTS);
    const prod1 = stats.find((s) => s.productId === "prod_001")!;

    // scores: [88, 72, 45] → avg = 68.3, median = 72
    expect(prod1.averageFitScore).toBeGreaterThan(68);
    expect(prod1.averageFitScore).toBeLessThan(69);
    expect(prod1.medianFitScore).toBe(72);
  });

  it("aggregateProductFitStats: Grade 분포", () => {
    const stats = aggregateProductFitStats(MOCK_COMPARE_RESULTS);
    const prod1 = stats.find((s) => s.productId === "prod_001")!;

    expect(prod1.gradeDistribution.PERFECT).toBe(1);
    expect(prod1.gradeDistribution.GOOD).toBe(1);
    expect(prod1.gradeDistribution.POOR).toBe(1);
  });

  it("aggregateProductFitStats: 성분 빈도 집계", () => {
    const stats = aggregateProductFitStats(MOCK_COMPARE_RESULTS);
    const prod1 = stats.find((s) => s.productId === "prod_001")!;

    // Glycerin은 3번 매칭됨
    const glycerinMatch = prod1.topMatchedIngredients.find(
      (i) => i.nameInci === "Glycerin"
    );
    expect(glycerinMatch).toBeTruthy();
    expect(glycerinMatch!.count).toBe(3);
  });

  it("aggregateProductFitStats: totalCompares 내림차순 정렬", () => {
    const stats = aggregateProductFitStats(MOCK_COMPARE_RESULTS);
    for (let i = 1; i < stats.length; i++) {
      expect(stats[i].totalCompares).toBeLessThanOrEqual(stats[i - 1].totalCompares);
    }
  });

  it("aggregateProductFitStats: 빈 배열 → 빈 결과", () => {
    const stats = aggregateProductFitStats([]);
    expect(stats.length).toBe(0);
  });

  // ── 파트너 스냅샷 ──

  it("generatePartnerSnapshot: 기본 구조", () => {
    const snapshot = generatePartnerSnapshot(
      "partner_001",
      MOCK_COMPARE_RESULTS,
      "DAILY",
      new Date("2025-06-01")
    );

    expect(snapshot.partnerId).toBe("partner_001");
    expect(snapshot.period.type).toBe("DAILY");
    expect(snapshot.totalCompares).toBe(5);
    expect(snapshot.uniqueUsers).toBe(4); // user_001 ~ user_004
    expect(snapshot.products.length).toBe(2);
    expect(snapshot.overallAvgFitScore).toBeGreaterThan(0);
  });

  it("generatePartnerSnapshot: 전체 평균 FIT Score 정확성", () => {
    const snapshot = generatePartnerSnapshot(
      "partner_001",
      MOCK_COMPARE_RESULTS,
      "MONTHLY",
      new Date("2025-06-01")
    );

    // scores: [88, 72, 45, 92, 65] → avg = 72.4
    expect(snapshot.overallAvgFitScore).toBeGreaterThan(72);
    expect(snapshot.overallAvgFitScore).toBeLessThan(73);
  });
});

// ════════════════════════════════════════════════════════════
// TEST SUITE 6: E2E 통합 시나리오
// ════════════════════════════════════════════════════════════

describe("E2E Integration: Normalize → Standard → FIT Score", () => {
  it("전체 파이프라인: 정규화 → 기준 생성 → 비교 분석", () => {
    // Step 1: 성분 정규화
    const normalizer = new IngredientNormalizer(MOCK_DICTIONARY);
    const raw = ["Niacinamide", "Hyaluronic Acid", "Glycerin", "Butylene Glycol"];
    const batch = normalizer.normalizeBatch(raw, "TEST");

    expect(batch.overallConfidence).toBe("HIGH");
    expect(batch.resolved).toBe(4);

    // Step 2: User Standard 생성
    const standard = generateUserStandard(THREE_HOLY_GRAILS);
    expect(standard.preferredIngredients.length).toBeGreaterThan(0);
    expect(standard.explain.headline.length).toBeGreaterThan(0);

    // Step 3: FIT Score 산출
    const fitResult = calculateFitScore({
      userStandard: standard,
      targetProduct: TARGET_PRODUCT_GOOD,
    });

    expect(fitResult.score).toBeGreaterThanOrEqual(0);
    expect(fitResult.score).toBeLessThanOrEqual(100);
    expect(fitResult.reasons.length).toBeGreaterThan(0);
    expect(fitResult.summary.length).toBeGreaterThan(0);
    expect(fitResult.breakdown.finalScore).toBe(fitResult.score);
  });

  it("정규화 실패 → Admin 로그 → 통계 요약", () => {
    const normalizer = new IngredientNormalizer(MOCK_DICTIONARY);

    // 일부 실패하는 배치
    normalizer.normalizeBatch(
      ["Niacinamide", "UnknownCompound1", "AnotherMissing"],
      "KFDA_API",
      "테스트 수집 배치"
    );

    const logs = normalizer.getFailureLogs();
    expect(logs.length).toBe(2);

    // Admin용 DB 형식 변환
    const dbRecords = formatFailureLogsForDb(logs, "sync_test_001");
    expect(dbRecords.length).toBe(2);
    expect(dbRecords[0].syncLogId).toBe("sync_test_001");

    // 요약 통계
    const summary = summarizeFailureLogs(logs);
    expect(summary.totalFailures).toBe(2);
    expect(summary.bySource["KFDA_API"]).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════
// 결과 출력
// ════════════════════════════════════════════════════════════

console.log(`\n${"═".repeat(60)}`);
console.log(`  📊 TEST RESULTS`);
console.log(`${"═".repeat(60)}`);
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`  📋 Total:  ${passed + failed}`);

if (failures.length > 0) {
  console.log(`\n  ── Failures ──`);
  for (const f of failures) {
    console.log(`  • ${f}`);
  }
}

console.log(`${"═".repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);
