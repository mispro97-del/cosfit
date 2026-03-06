// ============================================================
// COSFIT - FR-03: 성분 정규화 엔진 (Ingredient Normalizer)
// ============================================================
// 식약처 공공데이터의 성분명 표기 불일치를 해결하는 모듈.
// 4단계 매칭 전략: EXACT → ALIAS → CAS_NUMBER → FUZZY
// 매칭 실패 시 Admin 확인용 로그를 반환한다.
// ============================================================

import type {
  NormalizedIngredient,
  NormalizationBatchResult,
  NormalizationFailureLog,
  NormConfidence,
  IngredientDictionaryEntry,
} from "./types";

// ────────────────────────────────────────────────────────────
// 텍스트 전처리 유틸
// ────────────────────────────────────────────────────────────

/** 비교용 정규화: 소문자 + 공백/특수문자 제거 */
export function sanitize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "")          // 공백 제거
    .replace(/[-_.,;:()]/g, "")   // 구두점 제거
    .replace(/'/g, "")            // 어포스트로피
    .trim();
}

/** 한글 자모 분리 없이 단순 정규화 (한글 성분용) */
export function sanitizeKo(raw: string): string {
  return raw
    .replace(/\s+/g, "")
    .replace(/[-_.,;:()]/g, "")
    .trim();
}

// ────────────────────────────────────────────────────────────
// 레벤슈타인 거리 기반 유사도
// ────────────────────────────────────────────────────────────

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // 빈 문자열 처리
  if (m === 0) return n;
  if (n === 0) return m;

  // 1차원 배열 DP (메모리 최적화)
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // 삭제
        curr[j - 1] + 1,   // 삽입
        prev[j - 1] + cost  // 교체
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

/** 0~1 사이 유사도 (1 = 동일) */
export function similarity(a: string, b: string): number {
  const sa = sanitize(a);
  const sb = sanitize(b);
  if (sa === sb) return 1;
  const maxLen = Math.max(sa.length, sb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(sa, sb) / maxLen;
}

// ────────────────────────────────────────────────────────────
// 퍼지 매칭 임계값
// ────────────────────────────────────────────────────────────

const FUZZY_HIGH_THRESHOLD = 0.90;
const FUZZY_MEDIUM_THRESHOLD = 0.75;
const FUZZY_MINIMUM_THRESHOLD = 0.65;

// ────────────────────────────────────────────────────────────
// 메인 정규화 클래스
// ────────────────────────────────────────────────────────────

export class IngredientNormalizer {
  /** INCI명 → 사전 엔트리 (정확 매칭용) */
  private exactMap: Map<string, IngredientDictionaryEntry>;

  /** 별칭(alias) → 사전 엔트리 */
  private aliasMap: Map<string, IngredientDictionaryEntry>;

  /** CAS 번호 → 사전 엔트리 */
  private casMap: Map<string, IngredientDictionaryEntry>;

  /** 한글명 → 사전 엔트리 */
  private koMap: Map<string, IngredientDictionaryEntry>;

  /** 퍼지 매칭용 전체 엔트리 */
  private allEntries: IngredientDictionaryEntry[];

  /** 정규화 실패 로그 누적 */
  private failureLogs: NormalizationFailureLog[] = [];

  constructor(dictionary: IngredientDictionaryEntry[]) {
    this.exactMap = new Map();
    this.aliasMap = new Map();
    this.casMap = new Map();
    this.koMap = new Map();
    this.allEntries = dictionary;

    for (const entry of dictionary) {
      // INCI 정확 매칭
      this.exactMap.set(sanitize(entry.nameInci), entry);

      // 영문 통용명
      if (entry.nameEn) {
        this.exactMap.set(sanitize(entry.nameEn), entry);
      }

      // 한글명
      if (entry.nameKo) {
        this.koMap.set(sanitizeKo(entry.nameKo), entry);
      }

      // 별칭
      for (const alias of entry.aliases) {
        this.aliasMap.set(sanitize(alias), entry);
      }

      // CAS 번호
      if (entry.casNumber) {
        this.casMap.set(entry.casNumber.replace(/\s/g, ""), entry);
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // 단일 성분 정규화
  // ──────────────────────────────────────────────────────────

  normalize(rawName: string, source = "UNKNOWN", productContext?: string): NormalizedIngredient {
    const trimmed = rawName.trim();
    if (!trimmed) {
      return this.buildUnresolved(rawName, "빈 문자열 입력");
    }

    const strategies: string[] = [];

    // Strategy 1: EXACT (INCI / English)
    strategies.push("EXACT");
    const exactKey = sanitize(trimmed);
    const exactMatch = this.exactMap.get(exactKey);
    if (exactMatch) {
      return this.buildResolved(rawName, exactMatch, "HIGH", "EXACT");
    }

    // Strategy 1b: EXACT Korean
    const koKey = sanitizeKo(trimmed);
    const koMatch = this.koMap.get(koKey);
    if (koMatch) {
      return this.buildResolved(rawName, koMatch, "HIGH", "EXACT");
    }

    // Strategy 2: ALIAS
    strategies.push("ALIAS");
    const aliasMatch = this.aliasMap.get(exactKey);
    if (aliasMatch) {
      return this.buildResolved(rawName, aliasMatch, "HIGH", "ALIAS");
    }

    // Strategy 3: CAS Number (숫자-숫자-숫자 패턴)
    const casPattern = /^\d{2,7}-\d{2}-\d$/;
    if (casPattern.test(trimmed.replace(/\s/g, ""))) {
      strategies.push("CAS_NUMBER");
      const casMatch = this.casMap.get(trimmed.replace(/\s/g, ""));
      if (casMatch) {
        return this.buildResolved(rawName, casMatch, "HIGH", "CAS_NUMBER");
      }
    }

    // Strategy 4: FUZZY (레벤슈타인 유사도)
    strategies.push("FUZZY");
    const fuzzyResult = this.fuzzyMatch(trimmed);

    if (fuzzyResult) {
      const { entry, score } = fuzzyResult;

      let confidence: NormConfidence;
      if (score >= FUZZY_HIGH_THRESHOLD) {
        confidence = "HIGH";
      } else if (score >= FUZZY_MEDIUM_THRESHOLD) {
        confidence = "MEDIUM";
      } else {
        confidence = "LOW";
      }

      const result = this.buildResolved(rawName, entry, confidence, "FUZZY");
      if (confidence === "LOW") {
        result.lowConfidenceReason =
          `퍼지 매칭 유사도 ${(score * 100).toFixed(1)}% — '${entry.nameInci}'로 매핑되었으나 수동 검증 필요`;
      }
      return result;
    }

    // 모든 전략 실패 → UNRESOLVED
    const closestFuzzy = this.findClosest(trimmed);
    this.failureLogs.push({
      rawName: trimmed,
      attemptedStrategies: strategies,
      closestMatch: closestFuzzy
        ? { name: closestFuzzy.entry.nameInci, similarity: closestFuzzy.score }
        : undefined,
      source,
      productContext,
      timestamp: new Date(),
    });

    return this.buildUnresolved(
      rawName,
      closestFuzzy
        ? `가장 유사한 성분: '${closestFuzzy.entry.nameInci}' (${(closestFuzzy.score * 100).toFixed(1)}%) — 임계값 미달`
        : "사전에 일치하는 성분이 없음"
    );
  }

  // ──────────────────────────────────────────────────────────
  // 배치 정규화
  // ──────────────────────────────────────────────────────────

  normalizeBatch(
    rawNames: string[],
    source = "UNKNOWN",
    productContext?: string
  ): NormalizationBatchResult {
    const results = rawNames.map((name) => this.normalize(name, source, productContext));

    const resolved = results.filter((r) => r.confidence !== "UNRESOLVED").length;
    const unresolved = results.filter((r) => r.confidence === "UNRESOLVED").length;
    const lowConfidence = results.filter((r) => r.confidence === "LOW").length;

    let overallConfidence: NormConfidence;
    const resolveRate = rawNames.length > 0 ? resolved / rawNames.length : 0;

    if (resolveRate >= 0.95 && lowConfidence === 0) {
      overallConfidence = "HIGH";
    } else if (resolveRate >= 0.8) {
      overallConfidence = "MEDIUM";
    } else if (resolveRate >= 0.5) {
      overallConfidence = "LOW";
    } else {
      overallConfidence = "UNRESOLVED";
    }

    return {
      results,
      totalInput: rawNames.length,
      resolved,
      unresolved,
      lowConfidence,
      overallConfidence,
    };
  }

  // ──────────────────────────────────────────────────────────
  // 실패 로그 접근
  // ──────────────────────────────────────────────────────────

  getFailureLogs(): NormalizationFailureLog[] {
    return [...this.failureLogs];
  }

  clearFailureLogs(): void {
    this.failureLogs = [];
  }

  // ──────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────

  private fuzzyMatch(
    raw: string
  ): { entry: IngredientDictionaryEntry; score: number } | null {
    const sanitized = sanitize(raw);
    let bestEntry: IngredientDictionaryEntry | null = null;
    let bestScore = 0;

    for (const entry of this.allEntries) {
      // INCI명 유사도
      const inciScore = similarity(sanitized, entry.nameInci);
      if (inciScore > bestScore) {
        bestScore = inciScore;
        bestEntry = entry;
      }

      // 영문명 유사도
      if (entry.nameEn) {
        const enScore = similarity(sanitized, entry.nameEn);
        if (enScore > bestScore) {
          bestScore = enScore;
          bestEntry = entry;
        }
      }

      // 별칭 유사도
      for (const alias of entry.aliases) {
        const aliasScore = similarity(sanitized, alias);
        if (aliasScore > bestScore) {
          bestScore = aliasScore;
          bestEntry = entry;
        }
      }
    }

    if (bestEntry && bestScore >= FUZZY_MINIMUM_THRESHOLD) {
      return { entry: bestEntry, score: bestScore };
    }

    return null;
  }

  private findClosest(
    raw: string
  ): { entry: IngredientDictionaryEntry; score: number } | null {
    const sanitized = sanitize(raw);
    let bestEntry: IngredientDictionaryEntry | null = null;
    let bestScore = 0;

    for (const entry of this.allEntries) {
      const score = similarity(sanitized, entry.nameInci);
      if (score > bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }

    return bestEntry ? { entry: bestEntry, score: bestScore } : null;
  }

  private buildResolved(
    rawName: string,
    entry: IngredientDictionaryEntry,
    confidence: NormConfidence,
    strategy: NormalizedIngredient["matchStrategy"]
  ): NormalizedIngredient {
    return {
      rawName,
      standardName: entry.nameInci,
      standardNameKo: entry.nameKo,
      ingredientId: entry.id,
      confidence,
      matchStrategy: strategy,
    };
  }

  private buildUnresolved(rawName: string, reason: string): NormalizedIngredient {
    return {
      rawName,
      standardName: null,
      standardNameKo: null,
      ingredientId: null,
      confidence: "UNRESOLVED",
      matchStrategy: "NONE",
      lowConfidenceReason: reason,
    };
  }
}
