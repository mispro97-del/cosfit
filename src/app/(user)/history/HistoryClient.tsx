// ============================================================
// COSFIT - S6: 분석 히스토리 (Client Component)
// app/(user)/history/HistoryClient.tsx
// ============================================================
// compare_results 테이블에서 조회한 분석 히스토리를 
// 리스트로 표시하고, 클릭 시 상세 리포트로 이동한다.
// ============================================================

"use client";

import { useState } from "react";
import Link from "next/link";
import type { HistoryItem } from "../compare/actions";

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PERFECT: { label: "PERFECT", color: "#6B9E7D", bg: "#EDF5F0" },
  GOOD:    { label: "GOOD",    color: "#6B9E7D", bg: "#EDF5F0" },
  FAIR:    { label: "FAIR",    color: "#C4A83D", bg: "#FDF8E8" },
  POOR:    { label: "POOR",    color: "#D4665A", bg: "#FDF0EE" },
  RISK:    { label: "RISK",    color: "#D4665A", bg: "#FDF0EE" },
};

const CAT_EMOJI: Record<string, string> = {
  CREAM: "🧴", SERUM: "💧", TONER: "🍃", CLEANSER: "🫧",
  SUNSCREEN: "☀️", MASK: "🎭", OTHER: "✨",
};

// ────────────────────────────────────────────────────────────
// Mock Data (DB 연결 전)
// ────────────────────────────────────────────────────────────

const MOCK_HISTORY: HistoryItem[] = [
  { id: "cmp_001", productName: "에스트라 아토베리어 365 크림", productBrand: "에스트라", productCategory: "CREAM", productImage: null, fitScore: 82, fitGrade: "GOOD", reasonsCount: 5, risksCount: 2, createdAt: "2025-06-15T14:32:00Z" },
  { id: "cmp_002", productName: "토리든 다이브인 세럼", productBrand: "토리든", productCategory: "SERUM", productImage: null, fitScore: 91, fitGrade: "PERFECT", reasonsCount: 7, risksCount: 0, createdAt: "2025-06-14T10:15:00Z" },
  { id: "cmp_003", productName: "구달 맑은 비타C 잡티 세럼", productBrand: "구달", productCategory: "SERUM", productImage: null, fitScore: 68, fitGrade: "FAIR", reasonsCount: 3, risksCount: 3, createdAt: "2025-06-13T16:45:00Z" },
  { id: "cmp_004", productName: "바이오더마 센시비오 클렌징워터", productBrand: "바이오더마", productCategory: "CLEANSER", productImage: null, fitScore: 45, fitGrade: "POOR", reasonsCount: 2, risksCount: 4, createdAt: "2025-06-12T09:20:00Z" },
  { id: "cmp_005", productName: "코스알엑스 스네일 뮤신 에센스", productBrand: "COSRX", productCategory: "SERUM", productImage: null, fitScore: 87, fitGrade: "PERFECT", reasonsCount: 6, risksCount: 1, createdAt: "2025-06-11T13:50:00Z" },
  { id: "cmp_006", productName: "넘버즈인 3번 글루타치온 세럼", productBrand: "넘버즈인", productCategory: "SERUM", productImage: null, fitScore: 24, fitGrade: "RISK", reasonsCount: 1, risksCount: 5, createdAt: "2025-06-10T11:30:00Z" },
];

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

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
  const goodCount = data.filter((h) => h.fitGrade === "PERFECT" || h.fitGrade === "GOOD").length;
  const cautionCount = data.filter((h) => h.fitGrade === "POOR" || h.fitGrade === "RISK").length;

  return (
    <div className="pb-10">
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Stats summary */}
      <div className="flex gap-2.5 mb-5">
        <div className="flex-1 p-3.5 rounded-2xl text-center bg-[#F5EDE8] border border-[#EDE6DF]">
          <div className="text-2xl font-extrabold text-[#C4816A]">{avgScore}</div>
          <div className="text-[11px] text-[#8B7E76] mt-0.5">평균 FIT Score</div>
        </div>
        <div className="flex-1 p-3.5 rounded-2xl text-center bg-[#EDF5F0] border border-[#6B9E7D]/20">
          <div className="text-2xl font-extrabold text-[#6B9E7D]">{goodCount}</div>
          <div className="text-[11px] text-[#8B7E76] mt-0.5">Good 이상</div>
        </div>
        <div className="flex-1 p-3.5 rounded-2xl text-center bg-[#FDF0EE] border border-[#D4665A]/20">
          <div className="text-2xl font-extrabold text-[#D4665A]">{cautionCount}</div>
          <div className="text-[11px] text-[#8B7E76] mt-0.5">주의 필요</div>
        </div>
      </div>

      {/* Grade filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3" style={{ scrollbarWidth: "none" }}>
        {grades.map((g) => {
          const active = filter === g;
          const gc = g !== "ALL" ? GRADE_CONFIG[g] : null;
          return (
            <button
              key={g}
              onClick={() => setFilter(g)}
              className={`
                px-3.5 py-1.5 rounded-2xl text-xs font-semibold whitespace-nowrap
                border cursor-pointer transition-all duration-200
                ${active
                  ? "text-white border-transparent"
                  : "text-[#8B7E76] border-[#EDE6DF] bg-transparent hover:border-[#E8D4CA]"}
              `}
              style={active ? { background: gc?.color ?? "#C4816A" } : undefined}
            >
              {gradeLabels[g]}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-4xl block mb-3 opacity-30">✨</span>
          <p className="text-sm text-[#B5AAA2]">해당 등급의 분석 결과가 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((item, idx) => {
            const gc = GRADE_CONFIG[item.fitGrade] ?? GRADE_CONFIG.FAIR;
            const dateStr = new Date(item.createdAt).toLocaleDateString("ko-KR", {
              month: "short",
              day: "numeric",
            });

            return (
              <Link
                key={item.id}
                href={`/compare/${item.id}`}
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-[#EDE6DF] bg-white no-underline transition-shadow hover:shadow-[0_2px_12px_rgba(45,36,32,0.06)]"
                style={{
                  animation: `fadeInUp 0.3s ease ${idx * 0.05}s both`,
                }}
              >
                {/* Score */}
                <div
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                  style={{ background: gc.bg }}
                >
                  <span className="text-lg font-extrabold leading-none" style={{ color: gc.color }}>
                    {item.fitScore}
                  </span>
                  <span className="text-[8px] font-bold tracking-wider mt-0.5" style={{ color: gc.color }}>
                    {gc.label}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#2D2420] truncate">
                    {item.productName}
                  </div>
                  <div className="text-xs text-[#8B7E76] mt-0.5">
                    {item.productBrand} · {CAT_EMOJI[item.productCategory] ?? ""} {item.productCategory}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-[#6B9E7D]">✅ {item.reasonsCount}</span>
                    {item.risksCount > 0 && (
                      <span className="text-[11px] text-[#D4665A]">⚠️ {item.risksCount}</span>
                    )}
                    <span className="text-[11px] text-[#B5AAA2]">🕐 {dateStr}</span>
                  </div>
                </div>

                <span className="text-[#B5AAA2] text-sm">›</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
