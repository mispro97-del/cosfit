// ============================================================
// COSFIT - Admin ETL Pipeline Dashboard
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getETLStatus,
  getETLStats,
  triggerETL,
  type ETLStatusItem,
  type ETLStats,
} from "./actions";

// ── Badge 컴포넌트 ──

function Badge({
  label,
  color,
}: {
  label: string;
  color: "green" | "yellow" | "red" | "blue" | "gray";
}) {
  const colors = {
    green: "bg-green-900/40 text-green-300",
    yellow: "bg-yellow-900/40 text-yellow-300",
    red: "bg-red-900/40 text-red-300",
    blue: "bg-blue-900/40 text-blue-300",
    gray: "bg-gray-700/40 text-gray-300",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}
    >
      {label}
    </span>
  );
}

function entityBadge(entityType: string) {
  switch (entityType) {
    case "INGREDIENT":
      return <Badge label="성분" color="blue" />;
    case "REVIEW":
      return <Badge label="리뷰" color="green" />;
    case "PRODUCT":
      return <Badge label="제품" color="yellow" />;
    default:
      return <Badge label={entityType} color="gray" />;
  }
}

function missingRateBadge(rate: number) {
  if (rate <= 0.1) return <Badge label={`${(rate * 100).toFixed(1)}%`} color="green" />;
  if (rate <= 0.3) return <Badge label={`${(rate * 100).toFixed(1)}%`} color="yellow" />;
  return <Badge label={`${(rate * 100).toFixed(1)}%`} color="red" />;
}

// ── 카드 컴포넌트 ──

function StatCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "green" | "yellow" | "red" | "blue";
}) {
  const accentColors = {
    green: "border-green-500/30",
    yellow: "border-yellow-500/30",
    red: "border-red-500/30",
    blue: "border-blue-500/30",
  };
  return (
    <div
      className={`rounded-xl border bg-[#1A1D2E] p-5 ${
        accent ? accentColors[accent] : "border-[#2A2E42]"
      }`}
    >
      <div className="text-xs font-medium text-[#8B92A5] uppercase tracking-wide">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      {subtitle && (
        <div className="mt-1 text-xs text-[#555B6E]">{subtitle}</div>
      )}
    </div>
  );
}

// ── 파이프라인 항목 ──

function PipelineItem({
  title,
  description,
  count,
  type,
  onRun,
  isRunning,
}: {
  title: string;
  description: string;
  count: number;
  type: string;
  onRun: (type: string) => void;
  isRunning: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#2A2E42] bg-[#141620] p-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{title}</span>
          {count > 0 ? (
            <Badge label={`${count}건 대기`} color="yellow" />
          ) : (
            <Badge label="정상" color="green" />
          )}
        </div>
        <div className="mt-1 text-xs text-[#8B92A5]">{description}</div>
      </div>
      <button
        onClick={() => onRun(type)}
        disabled={isRunning}
        className="ml-4 rounded-lg bg-[#2A2E42] px-4 py-2 text-xs font-medium text-white hover:bg-[#363B52] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isRunning ? (
          <span className="flex items-center gap-1.5">
            <svg
              className="h-3.5 w-3.5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            실행 중...
          </span>
        ) : (
          "실행"
        )}
      </button>
    </div>
  );
}

// ── 메인 페이지 ──

export default function ETLPage() {
  const [stats, setStats] = useState<ETLStats | null>(null);
  const [logs, setLogs] = useState<ETLStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningType, setRunningType] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, logsData] = await Promise.all([
        getETLStats(),
        getETLStatus(),
      ]);
      setStats(statsData);
      setLogs(logsData);
    } catch (err) {
      console.error("ETL 데이터 로딩 실패:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunETL = async (type: string) => {
    setRunningType(type);
    setLastResult(null);
    try {
      const result = await triggerETL(type);
      const label =
        type === "full"
          ? "전체"
          : type === "ingredients"
          ? "성분"
          : type === "reviews"
          ? "리뷰"
          : "제품";

      if ("steps" in result) {
        // FullETLReport
        setLastResult(
          `${label} ETL 완료: 처리 ${result.summary.totalProcessed}건, 업데이트 ${result.summary.totalUpdated}건, 오류 ${result.summary.totalErrors}건 (${result.totalDurationMs}ms)`
        );
      } else {
        // ETLStepResult
        setLastResult(
          `${label} ETL 완료: 처리 ${result.processed}건, 업데이트 ${result.updated}건, 오류 ${result.errors}건 (${result.durationMs}ms)`
        );
      }

      // 데이터 새로고침
      await fetchData();
    } catch (err: any) {
      setLastResult(`ETL 실행 실패: ${err.message}`);
    } finally {
      setRunningType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-[#8B92A5]"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm text-[#8B92A5]">로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">ETL 파이프라인</h1>
          <p className="mt-1 text-sm text-[#8B92A5]">
            데이터 품질 점검 및 자동 처리 파이프라인 관리
          </p>
        </div>
        <button
          onClick={() => handleRunETL("full")}
          disabled={runningType !== null}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {runningType === "full" ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              실행 중...
            </span>
          ) : (
            "전체 ETL 실행"
          )}
        </button>
      </div>

      {/* 실행 결과 알림 */}
      {lastResult && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            lastResult.includes("실패")
              ? "border-red-500/30 bg-red-900/20 text-red-300"
              : "border-green-500/30 bg-green-900/20 text-green-300"
          }`}
        >
          {lastResult}
        </div>
      )}

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="마지막 실행"
            value={
              stats.lastRunTime
                ? new Date(stats.lastRunTime).toLocaleString("ko-KR")
                : "-"
            }
            subtitle="최근 ETL 실행 시간"
            accent="blue"
          />
          <StatCard
            title="총 실행 이력"
            value={stats.totalLogs}
            subtitle="DataQualityLog 기록 수"
            accent="green"
          />
          <StatCard
            title="미분석 리뷰"
            value={stats.pending.reviewsUnanalyzed}
            subtitle="감성 분석 대기"
            accent={stats.pending.reviewsUnanalyzed > 0 ? "yellow" : "green"}
          />
          <StatCard
            title="불완전 제품"
            value={stats.pending.productsIncomplete}
            subtitle="데이터 보완 필요"
            accent={stats.pending.productsIncomplete > 0 ? "red" : "green"}
          />
        </div>
      )}

      {/* Pipeline Status */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-white">
          파이프라인 현황
        </h2>
        {stats && (
          <div className="space-y-2">
            <PipelineItem
              title="성분 데이터 보강"
              description={`안전등급 미분류 ${stats.pending.ingredientsMissingSafety}건, 설명 누락 ${stats.pending.ingredientsMissingDescription}건`}
              count={
                stats.pending.ingredientsMissingSafety +
                stats.pending.ingredientsMissingDescription
              }
              type="ingredients"
              onRun={handleRunETL}
              isRunning={runningType === "ingredients"}
            />
            <PipelineItem
              title="리뷰 감성 분석"
              description={`미분석 리뷰 ${stats.pending.reviewsUnanalyzed}건 (배치 10건씩 처리)`}
              count={stats.pending.reviewsUnanalyzed}
              type="reviews"
              onRun={handleRunETL}
              isRunning={runningType === "reviews"}
            />
            <PipelineItem
              title="제품 데이터 품질"
              description={`성분 누락 또는 데이터 이슈 ${stats.pending.productsIncomplete}건`}
              count={stats.pending.productsIncomplete}
              type="products"
              onRun={handleRunETL}
              isRunning={runningType === "products"}
            />
          </div>
        )}
      </div>

      {/* Execution Log Table */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-white">실행 이력</h2>
        <div className="overflow-x-auto rounded-xl border border-[#2A2E42]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2E42] bg-[#141620]">
                <th className="px-4 py-3 text-left font-medium text-[#8B92A5]">
                  시간
                </th>
                <th className="px-4 py-3 text-left font-medium text-[#8B92A5]">
                  유형
                </th>
                <th className="px-4 py-3 text-right font-medium text-[#8B92A5]">
                  전체 수
                </th>
                <th className="px-4 py-3 text-right font-medium text-[#8B92A5]">
                  누락률
                </th>
                <th className="px-4 py-3 text-left font-medium text-[#8B92A5]">
                  상세
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-[#555B6E]"
                  >
                    실행 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[#1E2130] hover:bg-[#1A1D2E] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#8B92A5] whitespace-nowrap">
                      {new Date(log.checkedAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      {entityBadge(log.entityType)}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      {log.totalCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {missingRateBadge(log.missingRate)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#8B92A5] max-w-[300px] truncate">
                      {log.details
                        ? summarizeDetails(log.details)
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 유틸 ──

function summarizeDetails(details: Record<string, unknown>): string {
  const parts: string[] = [];

  if (typeof details.missingSafetyGrade === "number") {
    parts.push(`안전등급 누락: ${details.missingSafetyGrade}`);
  }
  if (typeof details.missingDescription === "number") {
    parts.push(`설명 누락: ${details.missingDescription}`);
  }
  if (typeof details.missingNameKo === "number") {
    parts.push(`한글명 누락: ${details.missingNameKo}`);
  }
  if (typeof details.analyzedCount === "number") {
    parts.push(`분석 완료: ${details.analyzedCount}`);
  }
  if (typeof details.unanalyzedCount === "number") {
    parts.push(`미분석: ${details.unanalyzedCount}`);
  }
  if (typeof details.batchUpdated === "number") {
    parts.push(`배치 처리: ${details.batchUpdated}건`);
  }
  if (typeof details.incompleteCount === "number") {
    parts.push(`불완전: ${details.incompleteCount}`);
  }
  if (typeof details.missingIngredients === "number") {
    parts.push(`성분 없음: ${details.missingIngredients}`);
  }
  if (typeof details.missingImage === "number") {
    parts.push(`이미지 없음: ${details.missingImage}`);
  }

  return parts.length > 0 ? parts.join(" | ") : "-";
}
