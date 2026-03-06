// ============================================================
// COSFIT - 관리자/입점사 통계 집계 & 실패 로그 관리
// ============================================================
// 1. 정규화 실패 로그 → DB 기록 인터페이스
// 2. 제품별 평균 FIT Score 통계 집계
// 3. 파트너 대시보드용 기간별 스냅샷 생성
// ============================================================

import type {
  NormalizationFailureLog,
  FitScoreResult,
  FitGrade,
  ProductFitStats,
  PartnerAggregateStats,
} from "./types";

// ────────────────────────────────────────────────────────────
// 1. 정규화 실패 로그 관리 (FR-D01 연결)
// ────────────────────────────────────────────────────────────

/**
 * 정규화 실패 로그를 DB에 기록하기 위한 형식으로 변환.
 * 실제 DB 저장은 Prisma repository 레이어에서 수행.
 */
export function formatFailureLogsForDb(
  logs: NormalizationFailureLog[],
  syncLogId?: string
): DbNormFailureRecord[] {
  return logs.map((log) => ({
    rawName: log.rawName,
    attemptedStrategies: log.attemptedStrategies,
    closestMatchName: log.closestMatch?.name ?? null,
    closestMatchSimilarity: log.closestMatch?.similarity
      ? Math.round(log.closestMatch.similarity * 1000) / 1000
      : null,
    source: log.source,
    productContext: log.productContext ?? null,
    syncLogId: syncLogId ?? null,
    createdAt: log.timestamp,
  }));
}

export interface DbNormFailureRecord {
  rawName: string;
  attemptedStrategies: string[];
  closestMatchName: string | null;
  closestMatchSimilarity: number | null;
  source: string;
  productContext: string | null;
  syncLogId: string | null;
  createdAt: Date;
}

/**
 * 실패 로그 요약 통계 (Admin 대시보드용).
 */
export function summarizeFailureLogs(logs: NormalizationFailureLog[]): FailureLogSummary {
  const bySource = new Map<string, number>();
  const unresolvedNames: string[] = [];
  let hasClosestMatch = 0;

  for (const log of logs) {
    bySource.set(log.source, (bySource.get(log.source) || 0) + 1);
    unresolvedNames.push(log.rawName);
    if (log.closestMatch) hasClosestMatch++;
  }

  return {
    totalFailures: logs.length,
    bySource: Object.fromEntries(bySource),
    withClosestMatch: hasClosestMatch,
    withoutClosestMatch: logs.length - hasClosestMatch,
    topUnresolvedNames: getMostFrequent(unresolvedNames, 10),
    resolutionRate:
      logs.length > 0
        ? Math.round((hasClosestMatch / logs.length) * 100) / 100
        : 1,
  };
}

export interface FailureLogSummary {
  totalFailures: number;
  bySource: Record<string, number>;
  withClosestMatch: number;
  withoutClosestMatch: number;
  topUnresolvedNames: { value: string; count: number }[];
  resolutionRate: number;
}

// ────────────────────────────────────────────────────────────
// 2. 제품별 FIT Score 통계 집계
// ────────────────────────────────────────────────────────────

/**
 * CompareResult 배열에서 제품별 FIT Score 통계를 산출.
 * 실제 사용 시 DB에서 조회한 CompareResult를 주입.
 */
export function aggregateProductFitStats(
  compareResults: CompareResultInput[]
): ProductFitStats[] {
  // 제품별 그룹핑
  const grouped = new Map<string, CompareResultInput[]>();

  for (const result of compareResults) {
    const existing = grouped.get(result.productId) || [];
    existing.push(result);
    grouped.set(result.productId, existing);
  }

  const stats: ProductFitStats[] = [];

  for (const [productId, results] of grouped) {
    const scores = results.map((r) => r.fitScore);
    const sortedScores = [...scores].sort((a, b) => a - b);

    // 평균
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    // 중앙값
    const mid = Math.floor(sortedScores.length / 2);
    const median =
      sortedScores.length % 2 === 0
        ? (sortedScores[mid - 1] + sortedScores[mid]) / 2
        : sortedScores[mid];

    // Grade 분포
    const gradeDistribution: Record<FitGrade, number> = {
      PERFECT: 0,
      GOOD: 0,
      FAIR: 0,
      POOR: 0,
      RISK: 0,
    };
    for (const r of results) {
      const grade = r.fitGrade as FitGrade;
      if (grade in gradeDistribution) {
        gradeDistribution[grade]++;
      }
    }

    // 매칭된 성분 집계
    const goodIngCounts = new Map<string, number>();
    const riskIngCounts = new Map<string, number>();

    for (const r of results) {
      if (r.matchedGoodIngredients) {
        for (const name of r.matchedGoodIngredients) {
          goodIngCounts.set(name, (goodIngCounts.get(name) || 0) + 1);
        }
      }
      if (r.matchedRiskIngredients) {
        for (const name of r.matchedRiskIngredients) {
          riskIngCounts.set(name, (riskIngCounts.get(name) || 0) + 1);
        }
      }
    }

    // 유니크 유저
    const uniqueUserIds = new Set(results.map((r) => r.userId));

    stats.push({
      productId,
      productName: results[0].productName ?? productId,
      totalCompares: results.length,
      averageFitScore: Math.round(avg * 10) / 10,
      medianFitScore: Math.round(median * 10) / 10,
      gradeDistribution,
      topMatchedIngredients: sortMapByValue(goodIngCounts, 10),
      topRiskIngredients: sortMapByValue(riskIngCounts, 10),
      uniqueUsers: uniqueUserIds.size,
    });
  }

  return stats.sort((a, b) => b.totalCompares - a.totalCompares);
}

/** DB에서 조회한 CompareResult의 최소 필드 */
export interface CompareResultInput {
  productId: string;
  productName?: string;
  userId: string;
  fitScore: number;
  fitGrade: string;
  matchedGoodIngredients?: string[];
  matchedRiskIngredients?: string[];
  createdAt: Date;
}

// ────────────────────────────────────────────────────────────
// 3. 파트너 기간별 스냅샷 생성
// ────────────────────────────────────────────────────────────

/**
 * 특정 파트너의 CompareResult를 기반으로
 * 일/주/월별 통계 스냅샷을 생성.
 */
export function generatePartnerSnapshot(
  partnerId: string,
  compareResults: CompareResultInput[],
  periodType: "DAILY" | "WEEKLY" | "MONTHLY",
  periodDate: Date
): PartnerAggregateStats {
  const products = aggregateProductFitStats(compareResults);

  const allScores = compareResults.map((r) => r.fitScore);
  const overallAvg =
    allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;

  const uniqueUsers = new Set(compareResults.map((r) => r.userId));

  return {
    partnerId,
    period: { type: periodType, date: periodDate },
    products,
    overallAvgFitScore: Math.round(overallAvg * 10) / 10,
    totalCompares: compareResults.length,
    uniqueUsers: uniqueUsers.size,
  };
}

// ────────────────────────────────────────────────────────────
// Utility helpers
// ────────────────────────────────────────────────────────────

function sortMapByValue(
  map: Map<string, number>,
  limit: number
): { nameInci: string; count: number }[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([nameInci, count]) => ({ nameInci, count }));
}

function getMostFrequent(
  arr: string[],
  limit: number
): { value: string; count: number }[] {
  const freq = new Map<string, number>();
  for (const item of arr) {
    freq.set(item, (freq.get(item) || 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}
