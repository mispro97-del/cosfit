"use client";

import { useState } from "react";
import Link from "next/link";
import type { HistoryItem } from "../compare/actions";

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PERFECT: { label: "PERFECT", color: "#059669", bg: "#ECFDF5", border: "rgba(5,150,105,0.2)" },
  GOOD:    { label: "GOOD",    color: "#10B981", bg: "#ECFDF5", border: "rgba(16,185,129,0.2)" },
  FAIR:    { label: "FAIR",    color: "#F59E0B", bg: "#FFFBEB", border: "rgba(245,158,11,0.2)" },
  POOR:    { label: "POOR",    color: "#EF4444", bg: "#FEF2F2", border: "rgba(239,68,68,0.2)" },
  RISK:    { label: "RISK",    color: "#DC2626", bg: "#FEF2F2", border: "rgba(220,38,38,0.2)" },
};

const CAT_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  CREAM:     { emoji: "🧴", label: "크림",   color: "#059669", bg: "#ECFDF5" },
  SERUM:     { emoji: "💧", label: "세럼",   color: "#0EA5E9", bg: "#F0F9FF" },
  TONER:     { emoji: "🍃", label: "토너",   color: "#10B981", bg: "#ECFDF5" },
  CLEANSER:  { emoji: "🫧", label: "클렌저", color: "#6B7280", bg: "#F3F4F6" },
  SUNSCREEN: { emoji: "☀️", label: "선크림", color: "#F59E0B", bg: "#FFFBEB" },
  MASK:      { emoji: "🎭", label: "마스크", color: "#8B5CF6", bg: "#F5F3FF" },
  OTHER:     { emoji: "✨", label: "기타",   color: "#6B7280", bg: "#F3F4F6" },
};

const MOCK_HISTORY: HistoryItem[] = [
  { id: "cmp_001", productName: "에스트라 아토베리어 365 크림", productBrand: "에스트라", productCategory: "CREAM", productImage: null, fitScore: 82, fitGrade: "GOOD", reasonsCount: 5, risksCount: 2, createdAt: "2025-06-15T14:32:00Z" },
  { id: "cmp_002", productName: "토리든 다이브인 세럼", productBrand: "토리든", productCategory: "SERUM", productImage: null, fitScore: 91, fitGrade: "PERFECT", reasonsCount: 7, risksCount: 0, createdAt: "2025-06-14T10:15:00Z" },
  { id: "cmp_003", productName: "구달 맑은 비타C 잡티 세럼", productBrand: "구달", productCategory: "SERUM", productImage: null, fitScore: 68, fitGrade: "FAIR", reasonsCount: 3, risksCount: 3, createdAt: "2025-06-13T16:45:00Z" },
  { id: "cmp_004", productName: "바이오더마 센시비오 클렌징워터", productBrand: "바이오더마", productCategory: "CLEANSER", productImage: null, fitScore: 45, fitGrade: "POOR", reasonsCount: 2, risksCount: 4, createdAt: "2025-06-12T09:20:00Z" },
  { id: "cmp_005", productName: "코스알엑스 스네일 뮤신 에센스", productBrand: "COSRX", productCategory: "SERUM", productImage: null, fitScore: 87, fitGrade: "PERFECT", reasonsCount: 6, risksCount: 1, createdAt: "2025-06-11T13:50:00Z" },
  { id: "cmp_006", productName: "넘버즈인 3번 글루타치온 세럼", productBrand: "넘버즈인", productCategory: "SERUM", productImage: null, fitScore: 24, fitGrade: "RISK", reasonsCount: 1, risksCount: 5, createdAt: "2025-06-10T11:30:00Z" },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "오늘";
  if (days === 1) return "1일 전";
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  return `${months}개월 전`;
}

interface Props {
  items?: HistoryItem[];
}

export function HistoryClient({ items }: Props) {
  const data = items ?? MOCK_HISTORY;
  const [filter, setFilter] = useState<string>("ALL");

  const grades = ["ALL", "PERFECT", "GOOD", "FAIR", "POOR", "RISK"];
  const gradeLabels: Record<string, string> = {
    ALL: "전체", PERFECT: "Perfect", GOOD: "Good",
    FAIR: "Fair", POOR: "Poor", RISK: "Risk",
  };

  const filtered = filter === "ALL" ? data : data.filter((h) => h.fitGrade === filter);

  const avgScore =
    data.length > 0
      ? Math.round(data.reduce((s, h) => s + h.fitScore, 0) / data.length)
      : 0;
  const goodCount = data.filter((h) => ["PERFECT", "GOOD"].includes(h.fitGrade)).length;
  const cautionCount = data.filter((h) => ["POOR", "RISK"].includes(h.fitGrade)).length;

  return (
    <div className="pb-4">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#1F2937]">분석 기록</h1>
        <p className="mt-1 text-sm text-[#6B7280]">총 {data.length}개의 분석 결과</p>
      </div>

      {/* Stats summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center rounded-2xl bg-white p-4 text-center"
          style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF5] mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-[26px] font-extrabold leading-none text-[#10B981]">{avgScore}</div>
          <div className="mt-1 text-[11px] font-medium text-[#6B7280]">평균 FIT</div>
        </div>

        <div className="flex flex-col items-center rounded-2xl bg-white p-4 text-center"
          style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF5] mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-[26px] font-extrabold leading-none text-[#10B981]">{goodCount}</div>
          <div className="mt-1 text-[11px] font-medium text-[#6B7280]">Good 이상</div>
        </div>

        <div className="flex flex-col items-center rounded-2xl bg-white p-4 text-center"
          style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF2F2] mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-[26px] font-extrabold leading-none text-[#EF4444]">{cautionCount}</div>
          <div className="mt-1 text-[11px] font-medium text-[#6B7280]">주의 필요</div>
        </div>
      </div>

      {/* Grade filter chips */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {grades.map((g) => {
          const active = filter === g;
          const gc = g !== "ALL" ? GRADE_CONFIG[g] : null;
          return (
            <button
              key={g}
              onClick={() => setFilter(g)}
              className="whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200"
              style={
                active
                  ? {
                      background: gc?.color ?? "#10B981",
                      color: "white",
                      border: "1px solid transparent",
                      boxShadow: `0 2px 8px ${gc?.color ?? "#10B981"}33`,
                    }
                  : {
                      background: "white",
                      color: "#6B7280",
                      border: "1px solid #E5E7EB",
                    }
              }
            >
              {gradeLabels[g]}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ECFDF5]">
            <span className="text-2xl">✨</span>
          </div>
          <p className="text-sm font-medium text-[#6B7280]">해당 등급의 분석 결과가 없어요</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">다른 필터를 선택해 보세요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item, idx) => {
            const gc = GRADE_CONFIG[item.fitGrade] ?? GRADE_CONFIG.FAIR;
            const cat = CAT_CONFIG[item.productCategory] ?? CAT_CONFIG.OTHER;

            return (
              <Link
                key={item.id}
                href={`/compare/${item.id}`}
                className="flex items-center gap-3.5 rounded-2xl bg-white p-4 no-underline transition-shadow duration-200 hover:shadow-md"
                style={{
                  border: "1px solid #E5E7EB",
                  animation: `fadeInUp 0.3s ease ${idx * 0.06}s both`,
                }}
              >
                {/* Score badge */}
                <div
                  className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl"
                  style={{ background: gc.bg, border: `1.5px solid ${gc.border}` }}
                >
                  <span className="text-xl font-extrabold leading-none" style={{ color: gc.color }}>
                    {item.fitScore}
                  </span>
                  <span className="mt-0.5 text-[8px] font-bold tracking-wider" style={{ color: gc.color }}>
                    {gc.label}
                  </span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[#1F2937]">
                    {item.productName}
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-[#6B7280]">{item.productBrand}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: cat.bg, color: cat.color }}
                    >
                      {cat.emoji} {cat.label}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-[11px] font-medium text-[#10B981]">
                      👍 {item.reasonsCount}개 매칭
                    </span>
                    {item.risksCount > 0 && (
                      <span className="text-[11px] font-medium text-[#EF4444]">
                        ⚠️ {item.risksCount}개 주의
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-[#9CA3AF]">
                      {relativeTime(item.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Chevron */}
                <svg
                  className="ml-1 h-5 w-5 shrink-0 text-[#D1D5DB]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
