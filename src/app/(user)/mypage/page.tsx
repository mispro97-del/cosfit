"use client";

import { signOut } from "next-auth/react";

export default function MyPage() {
  const profile = {
    description: "피부에 순한 성분을 선호하여 검증된 제품을 추구하는 타입",
    analysisCount: 3,
    skinTags: ["복합성", "Dryness, Elasticity", "예민함"],
    goodIngredients: ["판테놀", "병풀추출물", "세라마이드", "히알루론산"],
    cautionIngredients: ["향료", "에탄올", "강한 계면활성제"],
    criteria: [
      { label: "성분 안정성", value: 85 },
      { label: "자극 여부", value: 90 },
      { label: "가성비", value: 40 },
      { label: "브랜드", value: 40 },
      { label: "유행", value: 30 },
    ],
    goodProductCount: 1,
    badProductCount: 2,
    insight: "향료·알코올 계열이 포함된 제품에서 불편함을 느낀 경험이 많아요.",
  };

  return (
    <div className="pb-8">
      {/* Profile Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#ECFDF5] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={1.8}>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1F2937] leading-tight">개인 뷰티 프로필</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">사용 경험 {profile.analysisCount}건 기반</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#ECFDF5] text-[11px] font-semibold text-[#059669] border border-[#A7F3D0]">
          기준 활성
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-[#4B5563] mb-5 leading-relaxed">{profile.description}</p>

      {/* Skin Type Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {profile.skinTags.map((tag) => (
          <span
            key={tag}
            className="px-3.5 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-sm font-medium text-[#059669]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* 성분 성향 */}
      <div className="rounded-2xl bg-white p-5 mb-4" style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <h3 className="text-base font-bold text-[#1F2937] mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECFDF5]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </span>
          성분 성향
        </h3>

        <div className="mb-5">
          <p className="text-xs font-semibold text-[#6B7280] mb-2.5 uppercase tracking-wide">잘 맞는 성분</p>
          <div className="flex flex-wrap gap-2">
            {profile.goodIngredients.map((ing) => (
              <span
                key={ing}
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0" }}
              >
                {ing}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-[#6B7280] mb-2.5 uppercase tracking-wide">주의 성분</p>
          <div className="flex flex-wrap gap-2">
            {profile.cautionIngredients.map((ing) => (
              <span
                key={ing}
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
              >
                {ing}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-[#9CA3AF] mb-6">과거 사용 경험을 기준으로 도출된 성분 성향이에요.</p>

      {/* 내 선택 기준 - Horizontal Bar Chart */}
      <div className="rounded-2xl bg-white p-5 mb-4" style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <h3 className="text-base font-bold text-[#1F2937] mb-5 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECFDF5]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </span>
          내 선택 기준
        </h3>

        <div className="flex flex-col gap-4">
          {profile.criteria.map((c) => {
            const barColor = c.value >= 70 ? "#10B981" : c.value >= 50 ? "#F59E0B" : "#D1D5DB";
            const barBg = c.value >= 70 ? "rgba(16,185,129,0.15)" : c.value >= 50 ? "rgba(245,158,11,0.15)" : "rgba(209,213,219,0.3)";
            return (
              <div key={c.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-[#4B5563]">{c.label}</span>
                  <span className="text-sm font-bold text-[#1F2937]">{c.value}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: barBg }}>
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${c.value}%`, background: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-[#9CA3AF] mt-5 pt-3 border-t border-[#E5E7EB]">
          COSFIT이 판단한 나의 화장품 선택 기준
        </p>
      </div>

      {/* 제품 요약 */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-2xl p-4 bg-white text-center" style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF5] mx-auto mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-[#1F2937]">잘 맞았던 제품</p>
          <p className="text-2xl font-extrabold text-[#10B981] mt-1">{profile.goodProductCount}<span className="text-sm font-medium text-[#6B7280]">개</span></p>
        </div>
        <div className="rounded-2xl p-4 bg-white text-center" style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF2F2] mx-auto mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-[#1F2937]">불편했던 제품</p>
          <p className="text-2xl font-extrabold text-[#EF4444] mt-1">{profile.badProductCount}<span className="text-sm font-medium text-[#6B7280]">개</span></p>
        </div>
      </div>

      {/* Insight */}
      <div className="rounded-2xl p-4 bg-[#ECFDF5]" style={{ border: "1px solid #A7F3D0" }}>
        <div className="flex items-start gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#10B981] mt-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <p className="text-sm text-[#065F46] leading-relaxed">{profile.insight}</p>
        </div>
      </div>

      {/* 로그아웃 */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full mt-6 py-3 rounded-xl text-sm font-semibold text-[#EF4444] bg-white transition-colors hover:bg-[#FEF2F2]"
        style={{ border: "1px solid #FECACA" }}
      >
        로그아웃
      </button>
    </div>
  );
}
