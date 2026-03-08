// ============================================================
// COSFIT - Routine Analysis Results Page
// src/app/(user)/routine/analysis/page.tsx
// ============================================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getLatestAnalysis,
  type RoutineAnalysisResult,
  type RoutineConflict,
  type RoutineSynergy,
} from "../actions";

type TabType = "MORNING" | "EVENING";

function getScoreColor(score: number) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

function getScoreBg(score: number) {
  if (score >= 80) return "#ECFDF5";
  if (score >= 60) return "#FFFBEB";
  return "#FEF2F2";
}

function getScoreLabel(score: number) {
  if (score >= 85) return "최적 궁합";
  if (score >= 70) return "양호";
  if (score >= 50) return "보통";
  if (score >= 30) return "주의";
  return "위험";
}

function SeverityDots({ severity }: { severity: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor:
              i <= severity
                ? severity >= 4
                  ? "#EF4444"
                  : severity >= 2
                    ? "#F59E0B"
                    : "#9CA3AF"
                : "#E5E7EB",
          }}
        />
      ))}
    </div>
  );
}

function ConflictCard({ conflict }: { conflict: RoutineConflict }) {
  return (
    <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#EF4444] flex items-center justify-center shrink-0">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={3}
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-sm font-bold text-[#991B1B]">충돌</span>
        </div>
        <SeverityDots severity={conflict.severity} />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-[#1F2937]">
          {conflict.ingredientA.nameKo ?? conflict.ingredientA.nameInci}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#EF4444"
          strokeWidth={2}
        >
          <path
            d="M18 6L6 18M6 6l12 12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-semibold text-[#1F2937]">
          {conflict.ingredientB.nameKo ?? conflict.ingredientB.nameInci}
        </span>
      </div>
      {conflict.description && (
        <p className="text-xs text-[#6B7280] mb-2">{conflict.description}</p>
      )}
      <div className="flex gap-2 text-[10px] text-[#9CA3AF]">
        <span className="px-2 py-0.5 rounded-md bg-white/60">
          {conflict.productA}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-white/60">
          {conflict.productB}
        </span>
      </div>
    </div>
  );
}

function SynergyCard({ synergy }: { synergy: RoutineSynergy }) {
  return (
    <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center shrink-0">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth={3}
          >
            <polyline
              points="20 6 9 17 4 12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="text-sm font-bold text-[#065F46]">시너지</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-[#1F2937]">
          {synergy.ingredientA.nameKo ?? synergy.ingredientA.nameInci}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#10B981"
          strokeWidth={2.5}
        >
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-semibold text-[#1F2937]">
          {synergy.ingredientB.nameKo ?? synergy.ingredientB.nameInci}
        </span>
      </div>
      {synergy.description && (
        <p className="text-xs text-[#6B7280] mb-2">{synergy.description}</p>
      )}
      <div className="flex gap-2 text-[10px] text-[#9CA3AF]">
        <span className="px-2 py-0.5 rounded-md bg-white/60">
          {synergy.productA}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-white/60">
          {synergy.productB}
        </span>
      </div>
    </div>
  );
}

export default function RoutineAnalysisPage() {
  const [tab, setTab] = useState<TabType>("MORNING");
  const [analysis, setAnalysis] = useState<RoutineAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const result = await getLatestAnalysis(tab);
      if (result.success) {
        setAnalysis(result.data ?? null);
      } else {
        setError(result.error ?? "오류가 발생했습니다.");
      }
      setLoading(false);
    }
    load();
  }, [tab]);

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/routine"
          className="w-8 h-8 rounded-lg border border-[#E5E7EB] flex items-center justify-center no-underline hover:bg-[#F9FAFB] transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6B7280"
            strokeWidth={2}
          >
            <path
              d="M15 18l-6-6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">루틴 궁합 분석</h1>
          <p className="text-xs text-[#9CA3AF]">
            성분 간 상호작용 분석 결과
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(["MORNING", "EVENING"] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              tab === t
                ? "bg-[#10B981] text-white border-[#10B981] shadow-sm"
                : "bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]"
            }`}
          >
            {t === "MORNING" ? "모닝 루틴" : "이브닝 루틴"}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-[#10B981] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm text-[#EF4444]">{error}</p>
        </div>
      ) : !analysis ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9CA3AF"
              strokeWidth={1.5}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm text-[#6B7280] mb-1">분석 결과가 없습니다</p>
          <p className="text-xs text-[#9CA3AF] mb-4">
            루틴 페이지에서 궁합 분석을 실행해주세요
          </p>
          <Link
            href="/routine"
            className="inline-block px-4 py-2 rounded-xl bg-[#10B981] text-white text-sm font-semibold no-underline hover:bg-[#059669] transition-colors"
          >
            루틴으로 돌아가기
          </Link>
        </div>
      ) : (
        <>
          {/* Overall Score */}
          <div
            className="rounded-2xl p-6 mb-6 text-center"
            style={{ backgroundColor: getScoreBg(analysis.overallScore) }}
          >
            <p className="text-sm font-medium text-[#6B7280] mb-3">
              {tab === "MORNING" ? "모닝" : "이브닝"} 루틴 종합 점수
            </p>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg"
              style={{
                backgroundColor: getScoreColor(analysis.overallScore),
              }}
            >
              <span className="text-2xl font-black text-white">
                {analysis.overallScore}
              </span>
            </div>
            <p
              className="text-sm font-bold"
              style={{ color: getScoreColor(analysis.overallScore) }}
            >
              {getScoreLabel(analysis.overallScore)}
            </p>
            <p className="text-[10px] text-[#9CA3AF] mt-2">
              분석일시:{" "}
              {new Date(analysis.analyzedAt).toLocaleString("ko-KR")}
            </p>
          </div>

          {/* Conflicts Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-[#EF4444] flex items-center justify-center">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth={3}
                >
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="text-base font-bold text-[#1F2937]">
                충돌 성분
                {analysis.conflicts.length > 0 && (
                  <span className="ml-1 text-sm font-normal text-[#EF4444]">
                    ({analysis.conflicts.length}건)
                  </span>
                )}
              </h2>
            </div>
            {analysis.conflicts.length === 0 ? (
              <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4 text-center">
                <p className="text-sm text-[#065F46] font-medium">
                  충돌하는 성분이 없습니다
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {analysis.conflicts.map((conflict, i) => (
                  <ConflictCard key={i} conflict={conflict} />
                ))}
              </div>
            )}
          </div>

          {/* Synergies Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-[#10B981] flex items-center justify-center">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth={3}
                >
                  <polyline
                    points="20 6 9 17 4 12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="text-base font-bold text-[#1F2937]">
                시너지 성분
                {analysis.synergies.length > 0 && (
                  <span className="ml-1 text-sm font-normal text-[#10B981]">
                    ({analysis.synergies.length}건)
                  </span>
                )}
              </h2>
            </div>
            {analysis.synergies.length === 0 ? (
              <div className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl p-4 text-center">
                <p className="text-sm text-[#6B7280]">
                  시너지 효과가 감지되지 않았습니다
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {analysis.synergies.map((synergy, i) => (
                  <SynergyCard key={i} synergy={synergy} />
                ))}
              </div>
            )}
          </div>

          {/* Suggestions Section */}
          {analysis.suggestions.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-[#F59E0B] flex items-center justify-center">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth={3}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-[#1F2937]">
                  개선 제안
                </h2>
              </div>
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4">
                <ul className="space-y-2 list-none p-0 m-0">
                  {analysis.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#F59E0B] mt-0.5 shrink-0">
                        &bull;
                      </span>
                      <span className="text-sm text-[#92400E]">
                        {suggestion}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* CTA */}
          <Link
            href="/recommendations"
            className="block w-full py-3.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-sm font-bold text-center no-underline shadow-md hover:shadow-lg transition-all"
          >
            추천 제품 보기
          </Link>
        </>
      )}
    </div>
  );
}
