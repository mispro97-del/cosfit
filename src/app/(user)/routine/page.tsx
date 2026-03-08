// ============================================================
// COSFIT - Routine Management Page
// src/app/(user)/routine/page.tsx
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getRoutineProducts,
  updateRoutineOrder,
  analyzeRoutine,
  type RoutineProduct,
} from "./actions";

type TabType = "MORNING" | "EVENING";

function getScoreColor(score: number) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

function CategoryBadge({ category }: { category: string }) {
  const labels: Record<string, string> = {
    CLEANSER: "클렌저",
    TONER: "토너",
    SERUM: "세럼",
    EMULSION: "에멀전",
    CREAM: "크림",
    SUNSCREEN: "선크림",
    MASK: "마스크",
    EYE_CARE: "아이케어",
    LIP_CARE: "립케어",
    BODY_CARE: "바디케어",
    MAKEUP_BASE: "메이크업베이스",
    OTHER: "기타",
  };
  return (
    <span className="inline-block px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[10px] font-medium text-[#6B7280]">
      {labels[category] ?? category}
    </span>
  );
}

function ProductCard({
  product,
  index,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  product: RoutineProduct;
  index: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex items-center gap-3">
      {/* Order number */}
      <div className="w-7 h-7 rounded-full bg-[#ECFDF5] flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-[#059669]">{index + 1}</span>
      </div>

      {/* Product image placeholder */}
      <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-lg shrink-0">
        {product.productImage ? (
          <img
            src={product.productImage}
            alt={product.productName}
            className="w-full h-full object-cover rounded-xl"
          />
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9CA3AF"
            strokeWidth={1.5}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[#6B7280] mb-0.5">
          {product.productBrand}
        </p>
        <p className="text-sm font-semibold text-[#1F2937] truncate">
          {product.productName}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <CategoryBadge category={product.productCategory} />
          {product.rating && (
            <span className="text-[11px] text-[#F59E0B] font-medium">
              {"*".repeat(Math.round(product.rating))}{" "}
              {product.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Reorder buttons */}
      <div className="flex flex-col gap-1 shrink-0">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center disabled:opacity-30 hover:bg-[#F9FAFB] transition-colors"
          aria-label="위로 이동"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6B7280"
            strokeWidth={2.5}
          >
            <polyline
              points="18 15 12 9 6 15"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="w-7 h-7 rounded-lg border border-[#E5E7EB] bg-white flex items-center justify-center disabled:opacity-30 hover:bg-[#F9FAFB] transition-colors"
          aria-label="아래로 이동"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6B7280"
            strokeWidth={2.5}
          >
            <polyline
              points="6 9 12 15 18 9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function RoutinePage() {
  const [tab, setTab] = useState<TabType>("MORNING");
  const [morning, setMorning] = useState<RoutineProduct[]>([]);
  const [evening, setEvening] = useState<RoutineProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    score: number;
    id: string;
  } | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const result = await getRoutineProducts();
    if (result.success && result.data) {
      setMorning(result.data.morning);
      setEvening(result.data.evening);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const currentProducts = tab === "MORNING" ? morning : evening;
  const setCurrentProducts = tab === "MORNING" ? setMorning : setEvening;

  const handleMove = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentProducts.length) return;

    const updated = [...currentProducts];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setCurrentProducts(updated);

    // Persist both swapped items
    await Promise.all([
      updateRoutineOrder(updated[index].productId, tab, index),
      updateRoutineOrder(updated[newIndex].productId, tab, newIndex),
    ]);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    const result = await analyzeRoutine(tab);
    if (result.success && result.data) {
      setAnalysisResult({
        score: result.data.overallScore,
        id: result.data.id,
      });
    }
    setAnalyzing(false);
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937] mb-1">
          나의 스킨케어 루틴
        </h1>
        <p className="text-sm text-[#6B7280]">
          루틴 순서를 관리하고 성분 궁합을 분석해보세요
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(["MORNING", "EVENING"] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setAnalysisResult(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
              tab === t
                ? "bg-[#10B981] text-white border-[#10B981] shadow-sm"
                : "bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]"
            }`}
          >
            {t === "MORNING" ? "모닝 루틴" : "이브닝 루틴"}
            <span className="ml-1 text-xs opacity-70">
              (
              {t === "MORNING" ? morning.length : evening.length}
              )
            </span>
          </button>
        ))}
      </div>

      {/* Product list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-[#10B981] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : currentProducts.length === 0 ? (
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
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm text-[#6B7280] mb-1">등록된 제품이 없습니다</p>
          <p className="text-xs text-[#9CA3AF]">
            내 제품에서 루틴 제품을 등록해주세요
          </p>
          <Link
            href="/my-products"
            className="inline-block mt-4 px-4 py-2 rounded-xl bg-[#10B981] text-white text-sm font-semibold no-underline hover:bg-[#059669] transition-colors"
          >
            제품 등록하기
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 mb-6">
          {currentProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              onMoveUp={() => handleMove(index, "up")}
              onMoveDown={() => handleMove(index, "down")}
              isFirst={index === 0}
              isLast={index === currentProducts.length - 1}
            />
          ))}
        </div>
      )}

      {/* Analysis button */}
      {currentProducts.length >= 2 && (
        <div className="mt-4">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60"
          >
            {analyzing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                분석 중...
              </span>
            ) : (
              "궁합 분석하기"
            )}
          </button>
        </div>
      )}

      {/* Quick analysis result */}
      {analysisResult && (
        <div className="mt-5 bg-white border border-[#E5E7EB] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[#1F2937]">분석 완료</h3>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{
                backgroundColor: getScoreColor(analysisResult.score),
              }}
            >
              {analysisResult.score}
            </div>
          </div>
          <p className="text-sm text-[#6B7280] mb-4">
            {analysisResult.score >= 80
              ? "루틴 궁합이 아주 좋습니다!"
              : analysisResult.score >= 60
                ? "괜찮은 루틴이지만 개선 여지가 있습니다."
                : "주의가 필요한 성분 조합이 있습니다."}
          </p>
          <Link
            href="/routine/analysis"
            className="block w-full py-2.5 rounded-xl border border-[#10B981] text-[#10B981] text-sm font-semibold text-center no-underline hover:bg-[#ECFDF5] transition-colors"
          >
            상세 분석 결과 보기
          </Link>
        </div>
      )}

      {/* Link to recommendations */}
      {currentProducts.length > 0 && (
        <Link
          href="/recommendations"
          className="block mt-4 py-3 rounded-xl border border-[#E5E7EB] bg-white text-center text-sm font-semibold text-[#6B7280] no-underline hover:bg-[#F9FAFB] transition-colors"
        >
          추천 제품 보기 &rarr;
        </Link>
      )}
    </div>
  );
}
