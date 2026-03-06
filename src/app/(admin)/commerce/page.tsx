// ============================================================
// COSFIT - Admin: 커머스·정산 관리
// app/(admin)/commerce/page.tsx
// ============================================================

"use client";

import { useState } from "react";

const SETTLEMENTS = [
  { partner: "에스트라", orders: 1247, gmv: 89_400_000, rate: 8.5, payout: 81_801_000, status: "PAID" },
  { partner: "토리든", orders: 892, gmv: 52_300_000, rate: 10.0, payout: 47_070_000, status: "PENDING" },
  { partner: "구달", orders: 645, gmv: 38_200_000, rate: 9.0, payout: 34_762_000, status: "PENDING" },
  { partner: "바이오더마", orders: 423, gmv: 31_800_000, rate: 12.0, payout: 27_984_000, status: "PROCESSING" },
  { partner: "COSRX", orders: 387, gmv: 22_100_000, rate: 10.0, payout: 19_890_000, status: "PAID" },
  { partner: "넘버즈인", orders: 253, gmv: 14_700_000, rate: 9.5, payout: 13_303_500, status: "PENDING" },
];

const MONTHLY = [
  { month: "1월", gmv: 28.5 },
  { month: "2월", gmv: 31.2 },
  { month: "3월", gmv: 35.8 },
  { month: "4월", gmv: 38.1 },
  { month: "5월", gmv: 38.7 },
  { month: "6월", gmv: 42.3 },
];

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  PAID: { bg: "bg-emerald-900/30", text: "text-emerald-400", label: "정산 완료" },
  PENDING: { bg: "bg-amber-900/30", text: "text-amber-400", label: "정산 대기" },
  PROCESSING: { bg: "bg-blue-900/30", text: "text-blue-400", label: "처리 중" },
};

export default function AdminCommercePage() {
  const [tab, setTab] = useState<"gmv" | "settlement">("gmv");
  const [settlements, setSettlements] = useState(SETTLEMENTS);

  const totalGmv = 248_500_000;
  const thisMonthGmv = 42_300_000;
  const lastMonthGmv = 38_700_000;
  const maxGmv = Math.max(...MONTHLY.map((d) => d.gmv));

  const executeSettlement = (partner: string) => {
    setSettlements((prev) =>
      prev.map((s) =>
        s.partner === partner ? { ...s, status: "PROCESSING" } : s
      )
    );
    setTimeout(() => {
      setSettlements((prev) =>
        prev.map((s) =>
          s.partner === partner ? { ...s, status: "PAID" } : s
        )
      );
    }, 1500);
  };

  return (
    <div className="p-8 max-w-[1100px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white m-0">💰 커머스 · 정산 관리</h1>
          <p className="text-sm text-[#8B92A5] mt-1">플랫폼 GMV 통계 및 입점사별 정산</p>
        </div>
        <div className="flex gap-1 bg-[#1A1E2E] rounded-lg p-0.5 border border-[#2D3348]">
          {(["gmv", "settlement"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold border-none cursor-pointer transition-all ${
                tab === t
                  ? "bg-white/10 text-white"
                  : "bg-transparent text-[#555B6E]"
              }`}
            >
              {t === "gmv" ? "GMV 통계" : "정산 관리"}
            </button>
          ))}
        </div>
      </div>

      {tab === "gmv" && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              {
                label: "총 GMV",
                value: `${(totalGmv / 1_000_000).toFixed(0)}M`,
                sub: "누적 거래액",
                color: "text-white",
              },
              {
                label: "이번 달 GMV",
                value: `${(thisMonthGmv / 1_000_000).toFixed(1)}M`,
                sub: `+${(((thisMonthGmv / lastMonthGmv) - 1) * 100).toFixed(1)}% MoM`,
                color: "text-emerald-400",
              },
              {
                label: "FIT→구매 전환율",
                value: "12.4%",
                sub: "분석 → 주문 전환",
                color: "text-amber-400",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5"
              >
                <div className="text-xs text-[#8B92A5] mb-1">{s.label}</div>
                <div className={`text-3xl font-extrabold ${s.color}`}>
                  {s.value}
                </div>
                <div className="text-xs text-[#555B6E] mt-1">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: "총 주문 수", value: "3,847" },
              { label: "평균 주문금액", value: "64,500원" },
              { label: "입점 브랜드", value: "6개" },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5"
              >
                <div className="text-xs text-[#8B92A5] mb-1">{s.label}</div>
                <div className="text-xl font-bold text-white">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] p-5">
            <h3 className="text-sm font-semibold text-white m-0 mb-4">
              월별 GMV 추이 (백만원)
            </h3>
            <div className="flex items-end gap-4" style={{ height: 140 }}>
              {MONTHLY.map((d, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-xs font-semibold text-emerald-400">
                    {d.gmv}
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${(d.gmv / maxGmv) * 100}px`,
                      background:
                        "linear-gradient(180deg, #22C55E, rgba(34,197,94,0.4))",
                    }}
                  />
                  <span className="text-[10px] text-[#555B6E]">{d.month}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "settlement" && (
        <div className="bg-[#1A1E2E] rounded-xl border border-[#2D3348] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#2D3348] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white m-0">
              입점사별 정산 현황
            </h3>
            <span className="text-xs text-[#8B92A5]">
              정산 기간: 2025년 6월
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2D3348]">
                {[
                  "입점사",
                  "주문 수",
                  "GMV",
                  "수수료율",
                  "정산금액",
                  "상태",
                  "작업",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-2.5 text-xs font-medium text-[#555B6E]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {settlements.map((s, i) => {
                const st =
                  STATUS_STYLE[s.status] ?? STATUS_STYLE.PENDING;
                return (
                  <tr
                    key={i}
                    className="border-b border-[#1E2234] hover:bg-[#1E2234]"
                  >
                    <td className="px-5 py-3 font-semibold text-[#E5E7EB]">
                      {s.partner}
                    </td>
                    <td className="px-5 py-3 font-mono text-[#E5E7EB]">
                      {s.orders.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-semibold text-[#E5E7EB]">
                      {(s.gmv / 1_000_000).toFixed(1)}M
                    </td>
                    <td className="px-5 py-3 text-[#8B92A5]">
                      {s.rate}%
                    </td>
                    <td className="px-5 py-3 font-bold font-mono text-emerald-400">
                      {(s.payout / 1_000_000).toFixed(1)}M
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md ${st.bg} ${st.text}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {s.status === "PENDING" && (
                        <button
                          onClick={() => executeSettlement(s.partner)}
                          className="text-xs px-3 py-1 rounded-md bg-emerald-900/30 text-emerald-400 font-semibold border-none cursor-pointer hover:bg-emerald-900/50"
                        >
                          정산 실행
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-[#2D3348] flex justify-between items-center">
            <span className="text-sm text-[#8B92A5]">총 정산 예정액</span>
            <span className="text-lg font-extrabold text-emerald-400">
              {(settlements.reduce((s, x) => s + x.payout, 0) / 1_000_000).toFixed(1)}M원
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
