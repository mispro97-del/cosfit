// ============================================================
// COSFIT - S5: 비교 분석 결과 리포트 (Client Component)
// app/(user)/compare/[id]/CompareReportClient.tsx
// ============================================================

"use client";

import { useState } from "react";
import Link from "next/link";
import type { CompareResultDetail } from "../actions";

// ────────────────────────────────────────────────────────────
// Grade / Safety 설정
// ────────────────────────────────────────────────────────────

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string; msg: string }> = {
  PERFECT: { label: "PERFECT FIT", color: "#10B981", bg: "#ECFDF5", msg: "이 제품은 당신의 피부와 최고의 궁합이에요!" },
  GOOD:    { label: "GOOD FIT",    color: "#10B981", bg: "#ECFDF5", msg: "전반적으로 잘 맞는 제품이에요." },
  FAIR:    { label: "FAIR",        color: "#F59E0B", bg: "#FFFBEB", msg: "일부 성분은 맞지만 확인이 필요해요." },
  POOR:    { label: "POOR FIT",    color: "#EF4444", bg: "#FEF2F2", msg: "주의가 필요한 제품이에요." },
  RISK:    { label: "RISK",        color: "#EF4444", bg: "#FEF2F2", msg: "이 제품은 피부에 맞지 않을 가능성이 높아요." },
};

const SAFETY_STYLES: Record<string, { bg: string; color: string; text: string }> = {
  SAFE:      { bg: "#ECFDF5", color: "#059669", text: "안전" },
  MODERATE:  { bg: "#FFFBEB", color: "#D97706", text: "보통" },
  CAUTION:   { bg: "#FEF3C7", color: "#B45309", text: "주의" },
  HAZARDOUS: { bg: "#FEF2F2", color: "#DC2626", text: "위험" },
  UNKNOWN:   { bg: "#F3F4F6", color: "#6B7280", text: "미확인" },
};

const CATEGORY_EMOJIS: Record<string, string> = {
  CREAM: "🧴", SERUM: "💧", TONER: "🍃", CLEANSER: "🫧",
  SUNSCREEN: "☀️", MASK: "🎭", OTHER: "✨",
};

// ────────────────────────────────────────────────────────────
// Mock Data (DB 연결 전)
// ────────────────────────────────────────────────────────────

const MOCK: CompareResultDetail = {
  id: "cmp_001", productId: "prod_a1",
  productName: "에스트라 아토베리어 365 크림",
  productBrand: "에스트라", productCategory: "CREAM", productImage: null,
  fitScore: 82, fitGrade: "GOOD",
  matchedGood: [
    { ingredientId: "ig3", nameInci: "Glycerin", nameKo: "글리세린", reason: "선호 성분 포함 (상위 함량, 1번째) — 3/3개 인생템에 공통 포함 (상위 함량, 평균 만족도 4.7)", impactScore: 0.95, positionInProduct: 1 },
    { ingredientId: "ig9", nameInci: "Panthenol", nameKo: "판테놀", reason: "선호 성분 포함 (상위 함량, 3번째) — 진정·보습 핵심 성분", impactScore: 0.82, positionInProduct: 3 },
    { ingredientId: "ig8", nameInci: "Centella Asiatica Extract", nameKo: "센텔라아시아티카추출물", reason: "선호 성분 포함 (중간 함량, 8번째) — 진정 패턴 매칭", impactScore: 0.65, positionInProduct: 8 },
    { ingredientId: "ig1", nameInci: "Niacinamide", nameKo: "나이아신아마이드", reason: "선호 성분 포함 (중간 함량, 10번째) — 미백·톤업 효과", impactScore: 0.55, positionInProduct: 10 },
    { ingredientId: "ig4", nameInci: "Butylene Glycol", nameKo: "부틸렌글라이콜", reason: "선호 성분 포함 (상위 함량, 2번째)", impactScore: 0.48, positionInProduct: 2 },
  ],
  matchedRisk: [
    { ingredientId: "ig7", nameInci: "Fragrance", nameKo: "향료", riskLevel: "MEDIUM", reason: "일반적으로 알러지를 유발할 수 있는 성분 — 제품 내 25번째 성분", penaltyScore: 10, source: "ALLERGEN" },
    { ingredientId: "ig10", nameInci: "Phenoxyethanol", nameKo: "페녹시에탄올", riskLevel: "LOW", reason: "안전 등급: MODERATE — 방부제 성분", penaltyScore: 3, source: "SAFETY_GRADE" },
  ],
  missingPreferred: [
    { ingredientId: "ig2", nameInci: "Hyaluronic Acid", nameKo: "히알루론산", importance: "HIGH", weight: 0.78 },
    { ingredientId: "ig11", nameInci: "Adenosine", nameKo: "아데노신", importance: "MEDIUM", weight: 0.35 },
  ],
  summary: "'에스트라 아토베리어 365 크림'의 FIT Score는 82점 (GOOD)이에요. 전반적으로 잘 맞는 제품이에요. 선호 성분 5개 매칭: 글리세린, 판테놀, 센텔라아시아티카추출물 등이 포함되어 있어요. ⚠️ 주의 성분: 향료. 패치 테스트를 권장해요. 핵심 선호 성분 누락: 히알루론산.",
  breakdown: { baseScore: 78.5, riskPenalty: 13, bonusScore: 11, finalScore: 82 },
  metadata: { analysisModel: "cosfit-v1", processingTimeMs: 42, ingredientsCovered: 5, totalProductIngredients: 32, coverageRatio: 0.16 },
  ingredientComparison: {
    common: [
      { nameInci: "Glycerin", nameKo: "글리세린", category: "humectant", safetyGrade: "SAFE" },
      { nameInci: "Butylene Glycol", nameKo: "부틸렌글라이콜", category: "humectant", safetyGrade: "SAFE" },
      { nameInci: "Panthenol", nameKo: "판테놀", category: "soothing", safetyGrade: "SAFE" },
      { nameInci: "Niacinamide", nameKo: "나이아신아마이드", category: "brightening", safetyGrade: "SAFE" },
      { nameInci: "Centella Asiatica Extract", nameKo: "센텔라아시아티카추출물", category: "soothing", safetyGrade: "SAFE" },
      { nameInci: "Phenoxyethanol", nameKo: "페녹시에탄올", category: "preservative", safetyGrade: "MODERATE" },
    ],
    productOnly: [
      { nameInci: "Madecassoside", nameKo: "마데카소사이드", category: "soothing", safetyGrade: "SAFE", orderIndex: 5 },
      { nameInci: "Squalane", nameKo: "스쿠알란", category: "emollient", safetyGrade: "SAFE", orderIndex: 6 },
      { nameInci: "Ceramide NP", nameKo: "세라마이드NP", category: "barrier", safetyGrade: "SAFE", orderIndex: 7 },
      { nameInci: "Cholesterol", nameKo: "콜레스테롤", category: "emollient", safetyGrade: "SAFE", orderIndex: 9 },
      { nameInci: "Shea Butter", nameKo: "시어버터", category: "emollient", safetyGrade: "SAFE", orderIndex: 11 },
      { nameInci: "Allantoin", nameKo: "알란토인", category: "soothing", safetyGrade: "SAFE", orderIndex: 14 },
      { nameInci: "Tocopheryl Acetate", nameKo: "토코페릴아세테이트", category: "antioxidant", safetyGrade: "SAFE", orderIndex: 18 },
      { nameInci: "Fragrance", nameKo: "향료", category: "fragrance", safetyGrade: "CAUTION", orderIndex: 25 },
    ],
    holyGrailOnly: [
      { nameInci: "Hyaluronic Acid", nameKo: "히알루론산", category: "humectant", safetyGrade: "SAFE" },
      { nameInci: "Adenosine", nameKo: "아데노신", category: "anti-aging", safetyGrade: "SAFE" },
      { nameInci: "Cetearyl Alcohol", nameKo: "세테아릴알코올", category: "emollient", safetyGrade: "SAFE" },
    ],
  },
  dataConfidence: "HIGH",
  createdAt: "2025-06-15T14:32:00.000Z",
};

// Mock review data
const MOCK_REVIEWS = {
  rating: 4.2,
  count: 1284,
  pros: ["보습력이 오래 지속돼요", "민감한 피부에도 자극 없어요", "발림성이 좋아요"],
  cons: ["향이 조금 강해요", "가격대가 있는 편이에요"],
  keywords: ["보습", "진정", "저자극", "크림", "민감피부"],
};

// Mock store data
const MOCK_STORES = [
  { name: "네이버 쇼핑", price: 28900, url: "#", icon: "N" },
  { name: "쿠팡", price: 29500, url: "#", icon: "C" },
  { name: "올리브영", price: 32000, url: "#", icon: "O" },
];

// Mock alternative products
const MOCK_ALTERNATIVES = [
  { id: "alt1", name: "일리윤 세라마이드 크림", brand: "일리윤", score: 91, image: "🧴" },
  { id: "alt2", name: "라운드랩 자작나무 크림", brand: "라운드랩", score: 85, image: "🧴" },
  { id: "alt3", name: "닥터지 레드 블레미쉬 클리어", brand: "닥터지", score: 78, image: "🧴" },
];

// ────────────────────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────────────────────

function getScoreColor(score: number) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

// ────────────────────────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────────────────────────

function SafetyBadge({ grade }: { grade: string }) {
  const s = SAFETY_STYLES[grade] || SAFETY_STYLES.UNKNOWN;
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
      style={{ background: s.bg, color: s.color }}
    >
      {s.text}
    </span>
  );
}

function SectionCard({ title, icon, children, className = "" }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white border border-[#E5E7EB] rounded-2xl p-5 mb-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{icon}</span>
        <h3 className="text-[15px] font-bold text-[#1F2937]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function IngredientChip({ name, safetyGrade }: { name: string; safetyGrade: string }) {
  const s = SAFETY_STYLES[safetyGrade] || SAFETY_STYLES.UNKNOWN;
  return (
    <span
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-medium border"
      style={{ background: s.bg, color: s.color, borderColor: `${s.color}30` }}
    >
      {name}
    </span>
  );
}

function IngredientSection({ title, items, color, showOrder = false }: {
  title: string; items: any[]; color: string; showOrder?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 4);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-4 rounded-sm" style={{ background: color }} />
        <span className="text-sm font-semibold text-[#1F2937]">{title}</span>
        <span className="text-xs text-[#9CA3AF]">{items.length}개</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-[#9CA3AF] pl-3">해당 성분 없음</p>
      ) : (
        <>
          <div className="rounded-xl border border-[#E5E7EB] overflow-hidden">
            {visible.map((ing: any, i: number) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-2.5 ${
                  i < visible.length - 1 ? "border-b border-[#E5E7EB]" : ""
                } ${i % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"}`}
              >
                <div className="flex-1">
                  <span className="text-[13px] font-medium text-[#1F2937]">
                    {ing.nameKo || ing.nameInci}
                  </span>
                  {ing.nameKo && (
                    <span className="text-[11px] text-[#9CA3AF] ml-1.5">{ing.nameInci}</span>
                  )}
                </div>
                {showOrder && ing.orderIndex && (
                  <span className="text-[11px] text-[#9CA3AF] min-w-[28px] text-right">
                    #{ing.orderIndex}
                  </span>
                )}
                <SafetyBadge grade={ing.safetyGrade} />
              </div>
            ))}
          </div>
          {items.length > 4 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full mt-1.5 py-2 bg-transparent border border-dashed border-[#E5E7EB] rounded-xl text-[13px] text-[#10B981] cursor-pointer hover:bg-[#F9FAFB] transition-colors"
            >
              {expanded ? "접기" : `${items.length - 4}개 더 보기`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export function CompareReportClient({ data }: { data?: CompareResultDetail }) {
  const r = data ?? MOCK;
  const gc = GRADE_CONFIG[r.fitGrade] || GRADE_CONFIG.FAIR;
  const [showAllReasons, setShowAllReasons] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);

  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (r.fitScore / 100) * circumference;

  const visibleReasons = showAllReasons ? r.matchedGood : r.matchedGood.slice(0, 3);

  // Collect all ingredient names as chips
  const ingredientChips = [
    ...r.ingredientComparison.common.map((i) => ({ name: i.nameKo || i.nameInci, grade: i.safetyGrade })),
    ...r.ingredientComparison.productOnly.slice(0, 6).map((i) => ({ name: i.nameKo || i.nameInci, grade: i.safetyGrade })),
  ];

  return (
    <div className="max-w-[440px] mx-auto min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 bg-white/90 backdrop-blur-xl border-b border-[#E5E7EB] flex items-center gap-2">
        <Link
          href="/compare"
          className="text-[#6B7280] px-1 py-1 no-underline hover:text-[#1F2937] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <span className="text-base font-bold text-[#1F2937] tracking-tight">FIT Report</span>
        <div className="flex-1" />
        <span className="text-xs text-[#9CA3AF]">
          {new Date(r.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
        </span>
      </header>

      <div className="px-4 pb-10">
        {/* ── Product Info Card ── */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 mt-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-3xl shrink-0">
              {CATEGORY_EMOJIS[r.productCategory] || "✨"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#6B7280] mb-0.5">{r.productBrand}</p>
              <p className="text-[15px] font-bold text-[#1F2937] leading-tight">{r.productName}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="flex-1 py-2.5 bg-[#F3F4F6] text-[#6B7280] text-[13px] font-medium rounded-xl border-none cursor-pointer hover:bg-[#E5E7EB] transition-colors">
              다른 제품 선택
            </button>
            <button className="flex-1 py-2.5 bg-[#10B981] text-white text-[13px] font-semibold rounded-xl border-none cursor-pointer hover:bg-[#059669] transition-colors">
              분석하기
            </button>
          </div>
        </div>

        {/* ── FIT Score Circle ── */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 mb-4 text-center">
          <div className="relative mx-auto mb-4 flex h-44 w-44 items-center justify-center">
            {/* Glow */}
            <div
              className="absolute rounded-full"
              style={{
                width: 150, height: 150,
                background: `radial-gradient(circle, ${gc.color}18 0%, transparent 70%)`,
                filter: "blur(20px)",
              }}
            />
            <svg className="relative z-10" width="176" height="176" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="54" fill="none" stroke="#E5E7EB" strokeWidth="6" />
              <circle
                cx="64" cy="64" r="54" fill="none"
                stroke={gc.color} strokeWidth="6"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                strokeLinecap="round" transform="rotate(-90 64 64)"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
              <span
                className="text-[48px] font-extrabold leading-none"
                style={{ color: gc.color }}
              >
                {r.fitScore}
              </span>
              <span
                className="mt-1 text-xs font-bold tracking-widest"
                style={{ color: gc.color }}
              >
                {gc.label}
              </span>
            </div>
          </div>

          <p className="text-[15px] font-medium text-[#4B5563] mb-3">{gc.msg}</p>

          {/* Score breakdown pills */}
          <div className="flex justify-center gap-2">
            {[
              { label: "기본", value: r.breakdown.baseScore, color: "#3B82F6", sign: "" },
              { label: "보너스", value: r.breakdown.bonusScore, color: "#10B981", sign: "+" },
              { label: "감점", value: r.breakdown.riskPenalty, color: "#EF4444", sign: "-" },
            ].map((b, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: `${b.color}10`, color: b.color }}
              >
                {b.label} {b.sign}{Math.round(b.value * 10) / 10}
              </span>
            ))}
          </div>
        </div>

        {/* ── 적중도 근거 (Accuracy Evidence) ── */}
        <SectionCard title="적중도 근거" icon="🎯">
          {/* Good matches */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 rounded-full bg-[#ECFDF5] flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={3}>
                  <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-[#10B981]">
                잘 맞는 성분 {r.matchedGood.length}개
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {visibleReasons.map((g, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3 rounded-xl bg-[#F0FDF4] border border-[#10B981]/10"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-semibold text-[#1F2937]">
                        {g.nameKo || g.nameInci}
                      </span>
                      <span className="text-[11px] font-medium text-[#10B981]">
                        +{(g.impactScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7280] m-0 leading-relaxed">{g.reason}</p>
                  </div>
                </div>
              ))}
              {r.matchedGood.length > 3 && (
                <button
                  onClick={() => setShowAllReasons(!showAllReasons)}
                  className="py-2 bg-transparent border border-[#E5E7EB] rounded-xl text-[13px] text-[#10B981] cursor-pointer hover:bg-[#F0FDF4] transition-colors"
                >
                  {showAllReasons ? "접기" : `${r.matchedGood.length - 3}개 더 보기`}
                </button>
              )}
            </div>
          </div>

          {/* Risk matches */}
          {r.matchedRisk.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-full bg-[#FEF2F2] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth={3}>
                    <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-[#EF4444]">
                  주의 성분 {r.matchedRisk.length}개
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {r.matchedRisk.map((rk, i) => {
                  const riskColor = rk.riskLevel === "HIGH" ? "#EF4444" : rk.riskLevel === "MEDIUM" ? "#F59E0B" : "#6B7280";
                  const riskLabel = rk.riskLevel === "HIGH" ? "높음" : rk.riskLevel === "MEDIUM" ? "중간" : "낮음";
                  return (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-[#FEF2F2] border border-[#EF4444]/10">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm font-semibold text-[#1F2937]">
                            {rk.nameKo || rk.nameInci}
                          </span>
                          <span
                            className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                            style={{ background: `${riskColor}15`, color: riskColor }}
                          >
                            {riskLabel}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B7280] m-0 leading-relaxed">{rk.reason}</p>
                        <div className="text-[11px] text-[#9CA3AF] mt-1">
                          감점: -{rk.penaltyScore}점
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Missing preferred */}
          {r.missingPreferred.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded-full bg-[#FFFBEB] flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth={3}>
                    <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                    <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-[#F59E0B]">
                  누락 선호 성분 {r.missingPreferred.length}개
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {r.missingPreferred.map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-medium bg-[#FFFBEB] text-[#D97706] border border-[#F59E0B]/20"
                  >
                    {m.nameKo || m.nameInci}
                    <span className="text-[10px] text-[#9CA3AF]">
                      {m.importance === "HIGH" ? "필수" : "선호"}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── 성분 요약 (Ingredient Summary) ── */}
        <SectionCard title="성분 요약" icon="🧪">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ingredientChips.map((chip, i) => (
              <IngredientChip key={i} name={chip.name} safetyGrade={chip.grade} />
            ))}
          </div>
          <button
            onClick={() => setShowIngredients(!showIngredients)}
            className="w-full py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[13px] text-[#6B7280] font-medium cursor-pointer hover:bg-[#F3F4F6] transition-colors"
          >
            {showIngredients ? "성분 비교표 접기" : "성분 비교표 보기"}
          </button>
          {showIngredients && (
            <div className="mt-4">
              <IngredientSection
                title="공통 성분 (인생템 ∩ 이 제품)"
                items={r.ingredientComparison.common}
                color="#10B981"
              />
              <IngredientSection
                title="이 제품에만 있는 성분"
                items={r.ingredientComparison.productOnly}
                color="#3B82F6"
                showOrder
              />
              <IngredientSection
                title="인생템에만 있는 성분"
                items={r.ingredientComparison.holyGrailOnly}
                color="#F59E0B"
              />
            </div>
          )}
        </SectionCard>

        {/* ── 리뷰 요약 (Review Summary) ── */}
        <SectionCard title="리뷰 요약" icon="💬">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={star <= Math.round(MOCK_REVIEWS.rating) ? "#F59E0B" : "#E5E7EB"}
                  stroke="none"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-bold text-[#1F2937]">{MOCK_REVIEWS.rating}</span>
            <span className="text-xs text-[#9CA3AF]">({MOCK_REVIEWS.count.toLocaleString()}개 리뷰)</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Pros */}
            <div className="bg-[#F0FDF4] rounded-xl p-3">
              <p className="text-xs font-semibold text-[#10B981] mb-2">장점</p>
              <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
                {MOCK_REVIEWS.pros.map((pro, i) => (
                  <li key={i} className="text-xs text-[#4B5563] flex items-start gap-1">
                    <span className="text-[#10B981] shrink-0 mt-0.5">+</span>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            {/* Cons */}
            <div className="bg-[#FEF2F2] rounded-xl p-3">
              <p className="text-xs font-semibold text-[#EF4444] mb-2">단점</p>
              <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
                {MOCK_REVIEWS.cons.map((con, i) => (
                  <li key={i} className="text-xs text-[#4B5563] flex items-start gap-1">
                    <span className="text-[#EF4444] shrink-0 mt-0.5">-</span>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Keyword tags */}
          <div className="flex flex-wrap gap-1.5">
            {MOCK_REVIEWS.keywords.map((kw, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#6B7280]"
              >
                #{kw}
              </span>
            ))}
          </div>
        </SectionCard>

        {/* ── 최저가 / 구매처 (Store Links) ── */}
        <SectionCard title="최저가 / 구매처" icon="🛒">
          <div className="flex flex-col gap-2">
            {MOCK_STORES.map((store, i) => (
              <a
                key={i}
                href={store.url}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] no-underline hover:bg-[#F3F4F6] transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{
                    backgroundColor:
                      store.icon === "N" ? "#03C75A" : store.icon === "C" ? "#E31837" : "#9BCA3E",
                  }}
                >
                  {store.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1F2937]">{store.name}</p>
                </div>
                <span className="text-sm font-bold text-[#1F2937]">
                  {store.price.toLocaleString()}원
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2}>
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            ))}
          </div>
        </SectionCard>

        {/* ── 대체 추천 (Alternative Recommendations) ── */}
        <SectionCard title="대체 추천" icon="🔄">
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {MOCK_ALTERNATIVES.map((alt) => (
              <div
                key={alt.id}
                className="min-w-[130px] flex-shrink-0 text-center"
              >
                <div className="w-full aspect-square rounded-xl bg-[#F3F4F6] flex items-center justify-center text-3xl relative mb-2">
                  {alt.image}
                  <div className="absolute top-1.5 left-1.5">
                    <div
                      className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white"
                      style={{ backgroundColor: getScoreColor(alt.score) }}
                    >
                      {alt.score}점
                    </div>
                  </div>
                </div>
                <p className="text-xs text-[#6B7280] mb-0.5">{alt.brand}</p>
                <p className="text-[13px] font-medium text-[#1F2937] truncate">{alt.name}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Summary Box ── */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{
            background: gc.bg,
            border: "1px solid #E5E7EB",
            borderLeft: `3px solid ${gc.color}`,
          }}
        >
          <p className="m-0 text-[13px] leading-relaxed text-[#4B5563]">{r.summary}</p>
        </div>

        {/* ── Metadata ── */}
        <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-wrap gap-x-5 gap-y-2">
          {[
            { label: "분석 모델", value: r.metadata.analysisModel },
            { label: "처리 시간", value: `${r.metadata.processingTimeMs}ms` },
            { label: "커버리지", value: `${r.metadata.ingredientsCovered}/${r.metadata.totalProductIngredients} (${Math.round(r.metadata.coverageRatio * 100)}%)` },
          ].map((m, i) => (
            <div key={i}>
              <div className="text-[11px] text-[#9CA3AF]">{m.label}</div>
              <div className="text-[13px] font-semibold text-[#4B5563]">{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
