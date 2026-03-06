// ============================================================
// COSFIT - Partner Dashboard Client
// app/(partner)/dashboard/DashboardClient.tsx
// ============================================================

"use client";

import { useState } from "react";
import type { PartnerDashboardData } from "../actions";

// ── Mock data inline for client rendering ──
const D: PartnerDashboardData = {
  overview: { totalProducts: 24, totalCompares: 3_847, avgFitScore: 74.2, avgFitScoreDelta: 2.3, holyGrailCount: 412, uniqueUsers: 1_289 },
  fitScoreDistribution: [
    { grade: "PERFECT", count: 892, pct: 23.2 },
    { grade: "GOOD", count: 1_154, pct: 30.0 },
    { grade: "FAIR", count: 1_028, pct: 26.7 },
    { grade: "POOR", count: 541, pct: 14.1 },
    { grade: "RISK", count: 232, pct: 6.0 },
  ],
  topProducts: [
    { id: "pp1", name: "아토베리어 365 크림", category: "CREAM", avgFitScore: 82.1, compareCount: 847, holyGrailCount: 156 },
    { id: "pp2", name: "아토베리어 로션", category: "EMULSION", avgFitScore: 78.4, compareCount: 623, holyGrailCount: 98 },
    { id: "pp3", name: "더마 시카 크림", category: "CREAM", avgFitScore: 75.8, compareCount: 512, holyGrailCount: 67 },
    { id: "pp4", name: "아토베리어 선크림", category: "SUNSCREEN", avgFitScore: 71.2, compareCount: 489, holyGrailCount: 45 },
    { id: "pp5", name: "더마 시카 토너", category: "TONER", avgFitScore: 68.9, compareCount: 376, holyGrailCount: 34 },
  ],
  topMatchedIngredients: [
    { name: "Panthenol", nameKo: "판테놀", count: 2841 },
    { name: "Madecassoside", nameKo: "마데카소사이드", count: 2103 },
    { name: "Glycerin", nameKo: "글리세린", count: 1987 },
    { name: "Centella Asiatica Extract", nameKo: "센텔라추출물", count: 1654 },
    { name: "Squalane", nameKo: "스쿠알란", count: 1203 },
  ],
  topRiskIngredients: [
    { name: "Fragrance", nameKo: "향료", count: 892 },
    { name: "Phenoxyethanol", nameKo: "페녹시에탄올", count: 541 },
    { name: "Ethylhexylglycerin", nameKo: "에틸헥실글리세린", count: 234 },
  ],
  monthlyTrend: [
    { month: "1월", compares: 312, avgScore: 71.4 },
    { month: "2월", compares: 428, avgScore: 72.1 },
    { month: "3월", compares: 567, avgScore: 73.5 },
    { month: "4월", compares: 645, avgScore: 73.8 },
    { month: "5월", compares: 823, avgScore: 74.0 },
    { month: "6월", compares: 1072, avgScore: 74.2 },
  ],
};

const GRADE_COLOR: Record<string, string> = {
  PERFECT: "#22C55E", GOOD: "#6B9E7D", FAIR: "#EAB308", POOR: "#F97316", RISK: "#EF4444",
};

const CAT_EMOJI: Record<string, string> = {
  CREAM: "🧴", SERUM: "💧", TONER: "🍃", CLEANSER: "🫧", SUNSCREEN: "☀️", EMULSION: "🌊",
};

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E9ED] p-5">
      <div className="text-xs font-medium text-[#9CA3AF] mb-1">{label}</div>
      <div className="text-2xl font-bold text-[#1A1D21]" style={accent ? { color: accent } : undefined}>{value}</div>
      {sub && <div className="text-xs text-[#6B7280] mt-1">{sub}</div>}
    </div>
  );
}

function BarChart({ data, maxVal }: { data: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs font-medium text-[#6B7280] w-16 text-right">{d.label}</span>
          <div className="flex-1 h-6 bg-[#F3F4F6] rounded-md overflow-hidden">
            <div className="h-full rounded-md transition-all duration-700" style={{ width: `${(d.value / maxVal) * 100}%`, background: d.color }} />
          </div>
          <span className="text-xs font-semibold text-[#4B5563] w-10 text-right">{d.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function MiniLineChart({ data }: { data: { month: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const h = 80, w = 240;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d.value - min) / range) * (h - 16) - 8;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 80 }}>
      <polyline fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points.join(" ")} />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((d.value - min) / range) * (h - 16) - 8;
        return <circle key={i} cx={x} cy={y} r="3" fill="#3B82F6" />;
      })}
    </svg>
  );
}

export function DashboardClient() {
  const [period, setPeriod] = useState<"month" | "week">("month");

  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D21] m-0">인사이트 대시보드</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">자사 제품의 사용자 분석 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex gap-1 bg-[#F3F4F6] rounded-lg p-0.5">
          {(["month", "week"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border-none cursor-pointer transition-all ${period === p ? "bg-white text-[#1A1D21] shadow-sm" : "bg-transparent text-[#9CA3AF]"}`}>
              {p === "month" ? "월간" : "주간"}
            </button>
          ))}
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="총 비교 분석 수" value={D.overview.totalCompares.toLocaleString()} sub="최근 6개월 누적" />
        <StatCard label="평균 FIT Score" value={`${D.overview.avgFitScore}`} sub={`전월 대비 +${D.overview.avgFitScoreDelta}`} accent="#3B82F6" />
        <StatCard label="인생템 등록 수" value={D.overview.holyGrailCount.toLocaleString()} sub="사용자들의 인생템으로 등록된 횟수" accent="#6B9E7D" />
        <StatCard label="고유 사용자" value={D.overview.uniqueUsers.toLocaleString()} sub="자사 제품을 분석한 사용자 수" />
      </div>

      {/* Two column: FIT Score Distribution + Trend */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* FIT Score Distribution */}
        <div className="bg-white rounded-xl border border-[#E5E9ED] p-5">
          <h3 className="text-sm font-semibold text-[#1A1D21] m-0 mb-4">FIT Score 등급 분포</h3>
          <BarChart
            data={D.fitScoreDistribution.map((d) => ({
              label: d.grade,
              value: d.count,
              color: GRADE_COLOR[d.grade] ?? "#9CA3AF",
            }))}
            maxVal={Math.max(...D.fitScoreDistribution.map((d) => d.count))}
          />
          <div className="flex gap-3 mt-4 pt-3 border-t border-[#F3F4F6]">
            {D.fitScoreDistribution.map((d) => (
              <div key={d.grade} className="text-center flex-1">
                <div className="text-xs font-bold" style={{ color: GRADE_COLOR[d.grade] }}>{d.pct}%</div>
                <div className="text-[10px] text-[#9CA3AF]">{d.grade}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl border border-[#E5E9ED] p-5">
          <h3 className="text-sm font-semibold text-[#1A1D21] m-0 mb-4">월별 비교 분석 추이</h3>
          <MiniLineChart data={D.monthlyTrend.map((d) => ({ month: d.month, value: d.compares }))} />
          <div className="flex justify-between mt-2">
            {D.monthlyTrend.map((d) => (
              <span key={d.month} className="text-[10px] text-[#9CA3AF]">{d.month}</span>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[#F3F4F6] flex items-center gap-2">
            <span className="text-xs text-[#9CA3AF]">6월 비교 수:</span>
            <span className="text-sm font-bold text-[#3B82F6]">1,072건</span>
            <span className="text-xs text-[#22C55E]">▲ 30.3%</span>
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-xl border border-[#E5E9ED] p-5 mb-6">
        <h3 className="text-sm font-semibold text-[#1A1D21] m-0 mb-4">제품별 성과 TOP 5</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F3F4F6]">
              <th className="text-left py-2 text-xs font-medium text-[#9CA3AF]">제품명</th>
              <th className="text-right py-2 text-xs font-medium text-[#9CA3AF]">평균 FIT</th>
              <th className="text-right py-2 text-xs font-medium text-[#9CA3AF]">비교 수</th>
              <th className="text-right py-2 text-xs font-medium text-[#9CA3AF]">인생템 등록</th>
            </tr>
          </thead>
          <tbody>
            {D.topProducts.map((p, i) => {
              const scoreColor = p.avgFitScore >= 80 ? "#22C55E" : p.avgFitScore >= 70 ? "#3B82F6" : "#F97316";
              return (
                <tr key={p.id} className="border-b border-[#F9FAFB] hover:bg-[#F9FAFB] transition-colors">
                  <td className="py-3 flex items-center gap-2">
                    <span className="text-lg">{CAT_EMOJI[p.category] ?? "✨"}</span>
                    <div>
                      <div className="font-medium text-[#1A1D21]">{p.name}</div>
                      <div className="text-xs text-[#9CA3AF]">{p.category}</div>
                    </div>
                  </td>
                  <td className="text-right font-bold" style={{ color: scoreColor }}>{p.avgFitScore}</td>
                  <td className="text-right text-[#4B5563]">{p.compareCount.toLocaleString()}</td>
                  <td className="text-right">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#EDF5F0] text-[#4A7A5C]">
                      💝 {p.holyGrailCount}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Two column: Top Matched + Top Risk */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#E5E9ED] p-5">
          <h3 className="text-sm font-semibold text-[#1A1D21] m-0 mb-3">✅ 가장 많이 매칭된 성분</h3>
          <div className="space-y-2">
            {D.topMatchedIngredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#9CA3AF] w-4">{i + 1}</span>
                <span className="text-sm text-[#1A1D21] flex-1">{ing.nameKo}</span>
                <span className="text-xs text-[#6B7280]">{ing.name}</span>
                <span className="text-xs font-semibold text-[#6B9E7D]">{ing.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E9ED] p-5">
          <h3 className="text-sm font-semibold text-[#1A1D21] m-0 mb-3">⚠️ 주의 성분 빈도</h3>
          <div className="space-y-2">
            {D.topRiskIngredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#9CA3AF] w-4">{i + 1}</span>
                <span className="text-sm text-[#1A1D21] flex-1">{ing.nameKo}</span>
                <span className="text-xs text-[#6B7280]">{ing.name}</span>
                <span className="text-xs font-semibold text-[#D4665A]">{ing.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#9CA3AF] mt-3 pt-3 border-t border-[#F3F4F6]">
            💡 향료 성분이 자주 주의 요소로 감지되고 있어요. 무향 라인업을 고려해보세요.
          </p>
        </div>
      </div>
    </div>
  );
}
