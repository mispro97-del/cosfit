"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getDataQualityOverview,
  runQualityCheck,
  getQualityHistory,
  getDetailedMissingData,
  type EntityOverview,
  type QualityHistoryItem,
  type MissingDataItem,
} from "./actions";

function colorForPercent(pct: number): string {
  if (pct >= 90) return "bg-emerald-500";
  if (pct >= 70) return "bg-yellow-500";
  return "bg-red-500";
}

function textColorForPercent(pct: number): string {
  if (pct >= 90) return "text-emerald-400";
  if (pct >= 70) return "text-yellow-400";
  return "text-red-400";
}

function badgeColorForPercent(pct: number): string {
  if (pct >= 90) return "bg-emerald-900/40 text-emerald-300";
  if (pct >= 70) return "bg-yellow-900/40 text-yellow-300";
  return "bg-red-900/40 text-red-300";
}

const ENTITY_ICONS: Record<string, string> = {
  PRODUCT: "📦",
  INGREDIENT: "🧬",
  REVIEW: "💬",
};

export default function DataQualityPage() {
  const [overview, setOverview] = useState<EntityOverview[]>([]);
  const [history, setHistory] = useState<Record<string, QualityHistoryItem[]>>({});
  const [missingData, setMissingData] = useState<Record<string, MissingDataItem[]>>({});
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, prodHistory, ingredientHistory, reviewHistory] = await Promise.all([
        getDataQualityOverview(),
        getQualityHistory("PRODUCT", 10),
        getQualityHistory("INGREDIENT", 10),
        getQualityHistory("REVIEW", 10),
      ]);

      if (overviewRes.success && overviewRes.data) {
        setOverview(overviewRes.data);
      } else {
        setError(overviewRes.error ?? "데이터 로드 실패");
      }

      const hist: Record<string, QualityHistoryItem[]> = {};
      if (prodHistory.success && prodHistory.data) hist.PRODUCT = prodHistory.data;
      if (ingredientHistory.success && ingredientHistory.data) hist.INGREDIENT = ingredientHistory.data;
      if (reviewHistory.success && reviewHistory.data) hist.REVIEW = reviewHistory.data;
      setHistory(hist);

      // Find most recent check timestamp
      const allItems = [...(hist.PRODUCT ?? []), ...(hist.INGREDIENT ?? []), ...(hist.REVIEW ?? [])];
      if (allItems.length > 0) {
        const latest = allItems.reduce((a, b) =>
          new Date(a.checkedAt) > new Date(b.checkedAt) ? a : b
        );
        setLastChecked(latest.checkedAt);
      }
    } catch (err: any) {
      setError(err.message ?? "데이터 로드 중 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunCheck = async () => {
    setRunning(true);
    setError(null);
    try {
      const result = await runQualityCheck();
      if (result.success) {
        await loadData();
      } else {
        setError(result.error ?? "품질 체크 실패");
      }
    } catch (err: any) {
      setError(err.message ?? "품질 체크 실행 중 오류");
    } finally {
      setRunning(false);
    }
  };

  const toggleMissingData = async (entityType: string) => {
    if (expandedEntity === entityType) {
      setExpandedEntity(null);
      return;
    }
    if (!missingData[entityType]) {
      const res = await getDetailedMissingData(entityType);
      if (res.success && res.data) {
        setMissingData((prev) => ({ ...prev, [entityType]: res.data! }));
      }
    }
    setExpandedEntity(entityType);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#8B92A5] text-lg">데이터 품질 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">데이터 품질 대시보드</h1>
          <p className="text-sm text-[#8B92A5] mt-1">
            제품, 성분, 리뷰 데이터의 완성도를 모니터링합니다.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastChecked && (
            <span className="text-xs text-[#555B6E]">
              마지막 체크: {new Date(lastChecked).toLocaleString("ko-KR")}
            </span>
          )}
          <button
            onClick={handleRunCheck}
            disabled={running}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            {running ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                실행 중...
              </>
            ) : (
              "품질 체크 실행"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-800 p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {overview.map((entity) => (
          <div
            key={entity.entityType}
            className="rounded-xl border border-[#1E2130] bg-[#141620] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{ENTITY_ICONS[entity.entityType]}</span>
                <span className="text-white font-semibold">{entity.label}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-md ${badgeColorForPercent(entity.overallCompleteness)}`}>
                {entity.overallCompleteness}%
              </span>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {entity.totalCount.toLocaleString()}
            </div>
            <div className="text-xs text-[#8B92A5] mb-3">전체 레코드 수</div>
            {/* Mini progress bar */}
            <div className="w-full h-2 rounded-full bg-[#1E2130] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colorForPercent(entity.overallCompleteness)}`}
                style={{ width: `${entity.overallCompleteness}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Per-entity detail sections */}
      {overview.map((entity) => (
        <div
          key={entity.entityType}
          className="rounded-xl border border-[#1E2130] bg-[#141620] overflow-hidden"
        >
          <div className="p-5 border-b border-[#1E2130]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>{ENTITY_ICONS[entity.entityType]}</span>
                {entity.label} 필드별 완성도
              </h2>
              <span className={`text-sm font-bold ${textColorForPercent(entity.overallCompleteness)}`}>
                평균 {entity.overallCompleteness}%
              </span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {entity.fields.map((field) => (
              <div key={field.field}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-[#8B92A5]">{field.label}</span>
                  <span className="text-sm font-medium text-white">
                    {field.filled.toLocaleString()} / {field.total.toLocaleString()}
                    <span className={`ml-2 ${textColorForPercent(field.percentage)}`}>
                      ({field.percentage}%)
                    </span>
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-[#1E2130] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${colorForPercent(field.percentage)}`}
                    style={{ width: `${field.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Missing data toggle */}
          <div className="border-t border-[#1E2130] p-4">
            <button
              onClick={() => toggleMissingData(entity.entityType)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`transition-transform ${expandedEntity === entity.entityType ? "rotate-90" : ""}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              누락 데이터 목록 보기
            </button>

            {expandedEntity === entity.entityType && missingData[entity.entityType] && (
              <div className="mt-3 max-h-64 overflow-y-auto">
                {missingData[entity.entityType].length === 0 ? (
                  <p className="text-sm text-[#555B6E]">누락 데이터가 없습니다.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#8B92A5] border-b border-[#1E2130]">
                        <th className="text-left py-2 font-medium">이름</th>
                        <th className="text-left py-2 font-medium">누락 필드</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missingData[entity.entityType].map((item) => (
                        <tr key={item.id} className="border-b border-[#1E2130]/50">
                          <td className="py-2 text-white truncate max-w-[200px]">{item.name}</td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-1">
                              {item.missingFields.map((f) => (
                                <span
                                  key={f}
                                  className="px-2 py-0.5 rounded bg-red-900/30 text-red-300 text-xs"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Quality Trend */}
      <div className="rounded-xl border border-[#1E2130] bg-[#141620] overflow-hidden">
        <div className="p-5 border-b border-[#1E2130]">
          <h2 className="text-lg font-semibold text-white">품질 체크 이력</h2>
          <p className="text-xs text-[#8B92A5] mt-1">최근 10회 품질 체크 결과</p>
        </div>

        <div className="p-5">
          {Object.entries(history).map(([entityType, items]) => (
            <div key={entityType} className="mb-6 last:mb-0">
              <h3 className="text-sm font-semibold text-[#8B92A5] mb-3 flex items-center gap-2">
                <span>{ENTITY_ICONS[entityType]}</span>
                {entityType === "PRODUCT" ? "제품" : entityType === "INGREDIENT" ? "성분" : "리뷰"}
              </h3>

              {items.length === 0 ? (
                <p className="text-xs text-[#555B6E]">이력이 없습니다. 품질 체크를 실행해 주세요.</p>
              ) : (
                <div className="flex items-end gap-1 h-16">
                  {items
                    .slice()
                    .reverse()
                    .map((item, idx) => {
                      const completeness = Math.max(0, 100 - item.missingRate);
                      return (
                        <div
                          key={item.id}
                          className="group relative flex-1 min-w-[20px]"
                        >
                          <div
                            className={`w-full rounded-t transition-all duration-300 ${colorForPercent(completeness)}`}
                            style={{ height: `${Math.max(4, (completeness / 100) * 64)}px` }}
                          />
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                            <div className="bg-[#0F1117] border border-[#1E2130] rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                              <div className="text-white font-medium">{completeness.toFixed(1)}% 완성도</div>
                              <div className="text-[#8B92A5]">
                                총 {item.totalCount}건 / 누락률 {item.missingRate.toFixed(1)}%
                              </div>
                              <div className="text-[#555B6E]">
                                {new Date(item.checkedAt).toLocaleString("ko-KR")}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ))}

          {Object.keys(history).length === 0 && (
            <p className="text-sm text-[#555B6E] text-center py-8">
              아직 품질 체크 이력이 없습니다. 위의 &quot;품질 체크 실행&quot; 버튼을 눌러 첫 체크를 실행하세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
