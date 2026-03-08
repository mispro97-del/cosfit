// ============================================================
// COSFIT - 게스트 보기 클라이언트 컴포넌트
// app/share/[id]/GuestReportClient.tsx
// ============================================================
// 비로그인 사용자에게 FIT Score 요약본을 보여주고,
// 상세 분석(주의 요소, 성분 비교표)은 블러 처리하여
// 회원가입을 유도한다.
// ============================================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ── Types (게스트용 축소 데이터) ──

interface GuestReportData {
  id: string;
  productName: string;
  productBrand: string;
  productCategory: string;
  fitScore: number;
  fitGrade: string;
  matchedGoodCount: number;
  matchedRiskCount: number;
  topMatchedIngredients: { nameKo: string; nameInci: string }[];
  summary: string;
}

// ── Grade config ──

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string; msg: string }> = {
  PERFECT: { label: "PERFECT FIT", color: "#6B9E7D", bg: "#EDF5F0", emoji: "🎯", msg: "이 제품은 최고의 궁합이에요!" },
  GOOD:    { label: "GOOD FIT",    color: "#6B9E7D", bg: "#EDF5F0", emoji: "👍", msg: "전반적으로 잘 맞는 제품이에요." },
  FAIR:    { label: "FAIR",        color: "#C4A83D", bg: "#FDF8E8", emoji: "🤔", msg: "일부 성분 확인이 필요해요." },
  POOR:    { label: "POOR FIT",    color: "#EF4444", bg: "#FEF2F2", emoji: "⚠️", msg: "주의가 필요한 제품이에요." },
  RISK:    { label: "RISK",        color: "#EF4444", bg: "#FEF2F2", emoji: "🚫", msg: "맞지 않을 가능성이 높아요." },
};

const CAT_EMOJI: Record<string, string> = {
  CREAM: "🧴", SERUM: "💧", TONER: "🍃", CLEANSER: "🫧",
  SUNSCREEN: "☀️", MASK: "🎭", OTHER: "✨",
};

// ── Mock data (DB 연결 전) ──

const MOCK_GUEST: GuestReportData = {
  id: "cmp_001",
  productName: "에스트라 아토베리어 365 크림",
  productBrand: "에스트라",
  productCategory: "CREAM",
  fitScore: 82,
  fitGrade: "GOOD",
  matchedGoodCount: 5,
  matchedRiskCount: 2,
  topMatchedIngredients: [
    { nameKo: "글리세린", nameInci: "Glycerin" },
    { nameKo: "판테놀", nameInci: "Panthenol" },
    { nameKo: "센텔라아시아티카추출물", nameInci: "Centella Asiatica Extract" },
  ],
  summary: "'에스트라 아토베리어 365 크림'의 FIT Score는 82점 (GOOD). 선호 성분 5개 매칭: 글리세린, 판테놀, 센텔라 등. ⚠️ 주의: 향료. 패치 테스트 권장.",
};

// ── Component ──

interface Props {
  data?: GuestReportData;
  compareId?: string;
}

export function GuestReportClient({ data, compareId }: Props) {
  const r = data ?? MOCK_GUEST;
  const gc = GRADE_CONFIG[r.fitGrade] ?? GRADE_CONFIG.FAIR;

  const circumference = 2 * Math.PI * 54;
  const [dashOffset, setDashOffset] = useState(circumference);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDashOffset(circumference - (r.fitScore / 100) * circumference);
    }, 200);
    return () => clearTimeout(timer);
  }, [r.fitScore, circumference]);

  return (
    <div className="max-w-[440px] mx-auto min-h-screen bg-[#FFFFFF] relative">
      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Header */}
      <header className="px-5 py-3.5 border-b border-[#EDE6DF] flex items-center gap-2">
        <span className="text-lg font-extrabold tracking-tight text-[#2D2420]">COSFIT</span>
        <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-[#F5EDE8] text-[#059669]">
          공유된 리포트
        </span>
        <div className="flex-1" />
        <span className="text-xs text-[#B5AAA2] flex items-center gap-1">
          👁️ 게스트 보기
        </span>
      </header>

      <div className="px-5 pb-36">
        {/* Product info */}
        <div
          className="flex items-center justify-center gap-3 mt-6 mb-5"
          style={{ animation: "fadeInUp 0.5s ease both" }}
        >
          <span className="text-3xl">{CAT_EMOJI[r.productCategory] ?? "✨"}</span>
          <div>
            <div className="text-base font-bold text-[#2D2420]">{r.productName}</div>
            <div className="text-[13px] text-[#8B7E76]">
              {r.productBrand} · {r.productCategory}
            </div>
          </div>
        </div>

        {/* Score Gauge */}
        <div
          className="text-center mb-5"
          style={{ animation: "fadeInUp 0.5s ease 0.1s both" }}
        >
          <div className="relative w-40 h-40 mx-auto mb-3">
            <svg width="160" height="160" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="54" fill="none" stroke="#EDE6DF" strokeWidth="8" />
              <circle
                cx="64" cy="64" r="54" fill="none"
                stroke={gc.color} strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 64 64)"
                style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold leading-none" style={{ color: gc.color }}>
                {r.fitScore}
              </span>
              <span className="text-xs font-semibold tracking-widest mt-1" style={{ color: gc.color }}>
                {gc.label}
              </span>
            </div>
          </div>
          <p className="text-[15px] font-medium text-[#5A4F48]">
            {gc.emoji} {gc.msg}
          </p>
        </div>

        {/* Summary */}
        <div
          className="p-3.5 rounded-2xl bg-[#F9F3ED] border border-[#EDE6DF] mb-5"
          style={{ animation: "fadeInUp 0.5s ease 0.2s both" }}
        >
          <p className="text-[13px] text-[#5A4F48] leading-relaxed m-0">{r.summary}</p>
        </div>

        {/* Matched preview */}
        <div className="mb-5" style={{ animation: "fadeInUp 0.5s ease 0.3s both" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">✅</span>
            <span className="text-sm font-semibold text-[#2D2420]">
              매칭된 선호 성분 {r.matchedGoodCount}개
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {r.topMatchedIngredients.map((ing, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium bg-[#EDF5F0] text-[#4A7A5C]"
              >
                {ing.nameKo}
              </span>
            ))}
            {r.matchedGoodCount > r.topMatchedIngredients.length && (
              <span className="text-xs px-2.5 py-1.5 rounded-lg bg-[#F5EDE8] text-[#B5AAA2]">
                +{r.matchedGoodCount - r.topMatchedIngredients.length}개
              </span>
            )}
          </div>
        </div>

        {/* Blurred teaser sections */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ animation: "fadeInUp 0.5s ease 0.4s both" }}
        >
          {/* Fake blurred content */}
          <div style={{ filter: "blur(6px)", opacity: 0.5, pointerEvents: "none" }}>
            <div className="p-4 rounded-2xl border border-[#EDE6DF] bg-white mb-2">
              <div className="text-sm font-semibold text-[#2D2420] mb-2">⚠️ 주의 요소</div>
              <div className="h-14 rounded-lg bg-[#F5EDE8] mb-2" />
              <div className="h-10 rounded-lg bg-[#F5EDE8]" />
            </div>
            <div className="p-4 rounded-2xl border border-[#EDE6DF] bg-white mb-2">
              <div className="text-sm font-semibold text-[#2D2420] mb-2">❌ 누락된 선호 성분</div>
              <div className="h-8 rounded-lg bg-[#F5EDE8]" />
            </div>
            <div className="p-4 rounded-2xl border border-[#EDE6DF] bg-white">
              <div className="text-sm font-semibold text-[#2D2420] mb-2">🧪 성분 비교표</div>
              <div className="h-24 rounded-lg bg-[#F5EDE8]" />
            </div>
          </div>

          {/* Overlay CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FFFFFF]/70">
            <span className="text-2xl mb-2">🔒</span>
            <p className="text-sm font-semibold text-[#2D2420] mb-1">
              상세 분석은 회원만 볼 수 있어요
            </p>
            <p className="text-xs text-[#8B7E76] mb-0">
              가입하고 나만의 FIT Score를 받아보세요
            </p>
          </div>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] px-6 pb-7 pt-3 bg-gradient-to-t from-[#FFFFFF] via-[#FFFFFF] to-transparent z-40">
        <Link
          href="/onboarding"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-none text-base font-semibold no-underline bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-[0_4px_20px_rgba(16,185,129,0.35)]"
        >
          <span>👤</span>
          무료로 시작하기
        </Link>
        <p className="text-center text-xs text-[#B5AAA2] mt-2">
          30초면 가입 완료 · 나만의 뷰티 기준 생성
        </p>
      </div>
    </div>
  );
}
