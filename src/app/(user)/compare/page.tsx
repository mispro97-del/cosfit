"use client";

import Link from "next/link";

const MOCK_HISTORY = [
  { id: "cmp_001", name: "에스트라 아토베리어 크림", brand: "에스트라", price: 32000, score: 65, image: "🧴" },
  { id: "cmp_002", name: "이니스프리 그린티 세럼", brand: "이니스프리", price: 28000, score: 88, image: "💧" },
];

const MOCK_NEW_PRODUCTS = [
  { id: "p1", name: "토리든 다이브인 세럼", brand: "토리든", price: 22000, score: 82, image: "💧" },
  { id: "p2", name: "코스알엑스 저분자 히알...", brand: "코스알엑스", price: 24000, score: 92, image: "✨" },
  { id: "p3", name: "라운드랩 자작나무 수분 크림", brand: "라운드랩", price: 18000, score: 78, image: "🧴" },
  { id: "p4", name: "닥터지 레드 블레미쉬 클리어", brand: "닥터지", price: 15000, score: 71, image: "🫧" },
];

function getScoreColor(score: number) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

function ScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "md" }) {
  const color = getScoreColor(score);
  const isSm = size === "sm";
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white ${
        isSm ? "w-8 h-8 text-[11px]" : "w-9 h-9 text-xs"
      }`}
      style={{ backgroundColor: color }}
    >
      {score}
    </div>
  );
}

export default function ComparePage() {
  return (
    <div className="pb-8">
      {/* CTA Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] p-5 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold mb-1">화장품 비교하기</h2>
            <p className="text-sm text-white/80 m-0">
              이 제품이 나에게 잘 맞는지 바로 확인해보세요
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* 나의 비교 기록 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-base font-bold text-[#1F2937]">나의 비교 기록</h3>
        </div>
        <div className="flex flex-col gap-3">
          {MOCK_HISTORY.map((item) => (
            <Link key={item.id} href={`/compare/${item.id}`} className="block no-underline">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-2xl shrink-0 relative">
                  {item.image}
                  <div className="absolute -top-1.5 -right-1.5">
                    <ScoreBadge score={item.score} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#6B7280] mb-0.5">{item.brand}</p>
                  <p className="text-sm font-semibold text-[#1F2937] truncate">{item.name}</p>
                  <p className="text-sm font-bold text-[#1F2937] mt-0.5">{item.price.toLocaleString()}원</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2}>
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 내 기준으로 본 신제품 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={2}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="text-base font-bold text-[#1F2937]">내 기준으로 본 신제품</h3>
          </div>
          <button className="text-sm text-[#10B981] font-semibold bg-transparent border-none cursor-pointer">
            전체보기 &rarr;
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {MOCK_NEW_PRODUCTS.map((p) => (
            <div
              key={p.id}
              className="min-w-[150px] bg-white border border-[#E5E7EB] rounded-2xl p-3 flex-shrink-0 hover:shadow-md transition-shadow"
            >
              <div className="w-full aspect-square rounded-xl bg-[#F3F4F6] flex items-center justify-center text-3xl relative mb-2">
                {p.image}
                <div className="absolute top-1.5 left-1.5">
                  <div
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white"
                    style={{ backgroundColor: getScoreColor(p.score) }}
                  >
                    {p.score}점
                  </div>
                </div>
              </div>
              <p className="text-xs text-[#6B7280] mb-0.5">{p.brand}</p>
              <p className="text-sm font-medium text-[#1F2937] truncate">{p.name}</p>
              <p className="text-sm font-bold text-[#1F2937] mt-0.5">{p.price.toLocaleString()}원</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
