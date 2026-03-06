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

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string; msg: string }> = {
  PERFECT: { label: "PERFECT FIT", color: "#6B9E7D", bg: "#EDF5F0", emoji: "🎯", msg: "이 제품은 당신의 피부와 최고의 궁합이에요!" },
  GOOD:    { label: "GOOD FIT",    color: "#6B9E7D", bg: "#EDF5F0", emoji: "👍", msg: "전반적으로 잘 맞는 제품이에요." },
  FAIR:    { label: "FAIR",        color: "#C4A83D", bg: "#FDF8E8", emoji: "🤔", msg: "일부 성분은 맞지만 확인이 필요해요." },
  POOR:    { label: "POOR FIT",    color: "#D4665A", bg: "#FDF0EE", emoji: "⚠️", msg: "주의가 필요한 제품이에요." },
  RISK:    { label: "RISK",        color: "#D4665A", bg: "#FDF0EE", emoji: "🚫", msg: "이 제품은 피부에 맞지 않을 가능성이 높아요." },
};

const SAFETY_STYLES: Record<string, { bg: string; color: string; text: string }> = {
  SAFE:      { bg: "#EDF5F0", color: "#4A7A5C", text: "안전" },
  MODERATE:  { bg: "#FDF8E8", color: "#8B7A2C", text: "보통" },
  CAUTION:   { bg: "#FEF3CD", color: "#856404", text: "주의" },
  HAZARDOUS: { bg: "#FDF0EE", color: "#A34B42", text: "위험" },
  UNKNOWN:   { bg: "#F0F0F0", color: "#888",    text: "미확인" },
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

// ────────────────────────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────────────────────────

function Accordion({ title, icon, badgeText, badgeBg, badgeColor, defaultOpen = false, children }: {
  title: string; icon: React.ReactNode; badgeText: string; badgeBg: string; badgeColor: string;
  defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-[#EDE6DF] bg-white overflow-hidden mb-3">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3.5 flex items-center gap-2.5 bg-transparent border-none cursor-pointer text-left">
        {icon}
        <span className="flex-1 text-[15px] font-semibold text-[#2D2420]">{title}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: badgeBg, color: badgeColor }}>{badgeText}</span>
        <span className="text-[#B5AAA2] text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-4 pb-4 border-t border-[#EDE6DF]">{children}</div>}
    </div>
  );
}

function SafetyBadge({ grade }: { grade: string }) {
  const s = SAFETY_STYLES[grade] || SAFETY_STYLES.UNKNOWN;
  return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg" style={{ background: s.bg, color: s.color }}>{s.text}</span>;
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
        <span className="text-sm font-semibold text-[#2D2420]">{title}</span>
        <span className="text-xs text-[#B5AAA2]">{items.length}개</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-[#B5AAA2] pl-3">해당 성분 없음</p>
      ) : (
        <>
          <div className="rounded-xl border border-[#EDE6DF] overflow-hidden">
            {visible.map((ing, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-2.5 ${i < visible.length - 1 ? "border-b border-[#EDE6DF]" : ""} ${i % 2 === 0 ? "bg-white" : "bg-[#F9F3ED]"}`}>
                <div className="flex-1">
                  <span className="text-[13px] font-medium text-[#2D2420]">{ing.nameKo || ing.nameInci}</span>
                  {ing.nameKo && <span className="text-[11px] text-[#B5AAA2] ml-1.5">{ing.nameInci}</span>}
                </div>
                {showOrder && ing.orderIndex && (
                  <span className="text-[11px] text-[#B5AAA2] min-w-[28px] text-right">#{ing.orderIndex}</span>
                )}
                <SafetyBadge grade={ing.safetyGrade} />
              </div>
            ))}
          </div>
          {items.length > 4 && (
            <button onClick={() => setExpanded(!expanded)}
              className="w-full mt-1.5 py-2 bg-transparent border border-dashed border-[#EDE6DF] rounded-xl text-[13px] text-[#C4816A] cursor-pointer hover:bg-[#F9F3ED] transition-colors">
              {expanded ? "접기 ▲" : `${items.length - 4}개 더 보기 ▼`}
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

export function CompareReportClient({ compareId }: { compareId?: string }) {
  const r = MOCK; // DB 연결 시 props로 받은 data 사용
  const gc = GRADE_CONFIG[r.fitGrade] || GRADE_CONFIG.FAIR;
  const [showAllReasons, setShowAllReasons] = useState(false);

  const confLabel = r.dataConfidence === "HIGH" ? "High" : r.dataConfidence === "MEDIUM" ? "Medium" : "Low";
  const confColor = r.dataConfidence === "HIGH" ? "#6B9E7D" : r.dataConfidence === "MEDIUM" ? "#C4A83D" : "#D4665A";

  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (r.fitScore / 100) * circumference;

  const visibleReasons = showAllReasons ? r.matchedGood : r.matchedGood.slice(0, 3);

  return (
    <div className="max-w-[440px] mx-auto min-h-screen bg-[#FDFBF9]">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 bg-[#FDFBF9]/90 backdrop-blur-xl border-b border-[#EDE6DF] flex items-center gap-2">
        <Link href="/history" className="text-[#8B7E76] text-xl px-2 py-1 no-underline hover:text-[#2D2420] transition-colors">←</Link>
        <span className="text-base font-bold text-[#2D2420] tracking-tight">FIT Report</span>
        <div className="flex-1" />
        <span className="text-xs text-[#B5AAA2]">
          {new Date(r.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      </header>

      <div className="px-5 pb-10">
        {/* ── Product Info ── */}
        <div className="flex items-center justify-center gap-3 mt-6 mb-5">
          <span className="text-3xl">{CATEGORY_EMOJIS[r.productCategory] || "✨"}</span>
          <div>
            <div className="text-base font-bold text-[#2D2420]">{r.productName}</div>
            <div className="text-[13px] text-[#8B7E76]">{r.productBrand} · {r.productCategory}</div>
          </div>
        </div>

        {/* ── S5-1: Score Gauge ── */}
        <div className="text-center mb-4">
          <div className="relative w-40 h-40 mx-auto mb-3">
            <svg width="160" height="160" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="54" fill="none" stroke="#EDE6DF" strokeWidth="8" />
              <circle cx="64" cy="64" r="54" fill="none" stroke={gc.color} strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                strokeLinecap="round" transform="rotate(-90 64 64)"
                className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold leading-none" style={{ color: gc.color }}>{r.fitScore}</span>
              <span className="text-xs font-semibold tracking-widest mt-1" style={{ color: gc.color }}>{gc.label}</span>
            </div>
          </div>
          <p className="text-[15px] font-medium text-[#5A4F48] mb-3">{gc.emoji} {gc.msg}</p>

          {/* Confidence badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-2xl text-xs font-semibold"
            style={{ background: `${confColor}12`, color: confColor }}>
            🛡️ 데이터 신뢰도: {confLabel}
          </span>
        </div>

        {/* ── Breakdown ── */}
        <div className="flex gap-1.5 justify-center mb-5">
          {[
            { label: "기본", value: r.breakdown.baseScore, color: "#5A8EC4", sign: "" },
            { label: "보너스", value: r.breakdown.bonusScore, color: "#6B9E7D", sign: "+" },
            { label: "감점", value: r.breakdown.riskPenalty, color: "#D4665A", sign: "-" },
          ].map((b, i) => (
            <div key={i} className="text-center px-3.5 py-2 rounded-xl" style={{ background: `${b.color}08`, border: `1px solid ${b.color}20` }}>
              <div className="text-base font-bold" style={{ color: b.color }}>
                {b.sign}{Math.round(b.value * 10) / 10}
              </div>
              <div className="text-[11px] text-[#8B7E76]">{b.label}</div>
            </div>
          ))}
        </div>

        {/* ── Summary ── */}
        <div className="p-3.5 rounded-2xl bg-[#F9F3ED] border border-[#EDE6DF] mb-4">
          <p className="text-[13px] text-[#5A4F48] leading-relaxed m-0">{r.summary}</p>
        </div>

        {/* ── Reasons (잘 맞는 이유) ── */}
        <Accordion title="잘 맞는 이유" icon={<span className="text-lg">✅</span>}
          badgeText={`${r.matchedGood.length}개`} badgeBg="#EDF5F0" badgeColor="#4A7A5C" defaultOpen={true}>
          <div className="flex flex-col gap-2 pt-3">
            {visibleReasons.map((g, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-[#EDF5F0] border border-[#6B9E7D]/10">
                <div className="w-9 h-9 rounded-lg bg-[#6B9E7D]/10 flex items-center justify-center shrink-0 text-sm">📈</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-semibold text-[#2D2420]">{g.nameKo || g.nameInci}</span>
                    <span className="text-[11px] font-medium text-[#6B9E7D]">+{(g.impactScore * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-[#8B7E76] m-0 leading-relaxed">{g.reason}</p>
                  <div className="text-[11px] text-[#B5AAA2] mt-1">
                    제품 내 {g.positionInProduct}번째 · {g.positionInProduct <= 5 ? "상위 함량" : g.positionInProduct <= 15 ? "중간 함량" : "소량"}
                  </div>
                </div>
              </div>
            ))}
            {r.matchedGood.length > 3 && (
              <button onClick={() => setShowAllReasons(!showAllReasons)}
                className="py-2 bg-transparent border border-[#EDE6DF] rounded-xl text-[13px] text-[#C4816A] cursor-pointer hover:bg-[#F9F3ED] transition-colors">
                {showAllReasons ? "접기 ▲" : `${r.matchedGood.length - 3}개 더 보기 ▼`}
              </button>
            )}
          </div>
        </Accordion>

        {/* ── Risks (주의 요소) ── */}
        <Accordion title="주의 요소" icon={<span className="text-lg">⚠️</span>}
          badgeText={r.matchedRisk.length > 0 ? `${r.matchedRisk.length}개` : "없음"}
          badgeBg={r.matchedRisk.length > 0 ? "#FDF0EE" : "#EDF5F0"}
          badgeColor={r.matchedRisk.length > 0 ? "#A34B42" : "#4A7A5C"} defaultOpen={r.matchedRisk.length > 0}>
          {r.matchedRisk.length === 0 ? (
            <p className="text-sm text-[#8B7E76] text-center py-4">주의할 성분이 없어요. 안심하세요! ✨</p>
          ) : (
            <div className="flex flex-col gap-2 pt-3">
              {r.matchedRisk.map((rk, i) => {
                const riskColor = rk.riskLevel === "HIGH" ? "#D4665A" : rk.riskLevel === "MEDIUM" ? "#C4A83D" : "#8B7E76";
                const riskBg = rk.riskLevel === "HIGH" ? "#FDF0EE" : rk.riskLevel === "MEDIUM" ? "#FDF8E8" : "#F8F8F8";
                const riskLabel = rk.riskLevel === "HIGH" ? "높음" : rk.riskLevel === "MEDIUM" ? "중간" : "낮음";
                return (
                  <div key={i} className="flex gap-3 p-3 rounded-xl border" style={{ background: riskBg, borderColor: `${riskColor}20` }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm" style={{ background: `${riskColor}15` }}>📉</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm font-semibold text-[#2D2420]">{rk.nameKo || rk.nameInci}</span>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${riskColor}15`, color: riskColor }}>{riskLabel}</span>
                      </div>
                      <p className="text-xs text-[#8B7E76] m-0 leading-relaxed">{rk.reason}</p>
                      <div className="text-[11px] text-[#B5AAA2] mt-1">
                        감점: -{rk.penaltyScore}점 · 출처: {rk.source === "ALLERGEN" ? "알러젠" : rk.source === "EWG" ? "EWG" : rk.source === "SAFETY_GRADE" ? "안전등급" : rk.source}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Accordion>

        {/* ── Missing Preferred ── */}
        {r.missingPreferred.length > 0 && (
          <Accordion title="누락된 선호 성분" icon={<span className="text-lg">❌</span>}
            badgeText={`${r.missingPreferred.length}개`} badgeBg="#FDF8E8" badgeColor="#8B7A2C">
            <div className="flex flex-col gap-1.5 pt-3">
              {r.missingPreferred.map((m, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#FDF8E8]">
                  <div className="w-2 h-2 rounded-full" style={{ background: m.importance === "HIGH" ? "#D4665A" : "#C4A83D" }} />
                  <span className="text-sm font-medium text-[#2D2420] flex-1">{m.nameKo || m.nameInci}</span>
                  <span className="text-[11px] text-[#8B7E76]">중요도: {m.importance === "HIGH" ? "높음" : "보통"}</span>
                </div>
              ))}
            </div>
          </Accordion>
        )}

        {/* ── S5-2: Ingredient Comparison Table ── */}
        <Accordion title="성분 비교표" icon={<span className="text-lg">🧪</span>}
          badgeText="상세" badgeBg="#F5EDE8" badgeColor="#A66B55">
          <div className="pt-3">
            <IngredientSection title="공통 성분 (인생템 ∩ 이 제품)" items={r.ingredientComparison.common} color="#6B9E7D" />
            <IngredientSection title="이 제품에만 있는 성분" items={r.ingredientComparison.productOnly} color="#5A8EC4" showOrder />
            <IngredientSection title="인생템에만 있는 성분" items={r.ingredientComparison.holyGrailOnly} color="#C4A83D" />
          </div>
        </Accordion>

        {/* ── Metadata ── */}
        <div className="mt-2 p-3 rounded-xl bg-[#F9F3ED] flex flex-wrap gap-x-5 gap-y-2">
          {[
            { label: "분석 모델", value: r.metadata.analysisModel },
            { label: "처리 시간", value: `${r.metadata.processingTimeMs}ms` },
            { label: "커버리지", value: `${r.metadata.ingredientsCovered}/${r.metadata.totalProductIngredients} (${Math.round(r.metadata.coverageRatio * 100)}%)` },
          ].map((m, i) => (
            <div key={i}>
              <div className="text-[11px] text-[#B5AAA2]">{m.label}</div>
              <div className="text-[13px] font-semibold text-[#5A4F48]">{m.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
