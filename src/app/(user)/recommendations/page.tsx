// ============================================================
// COSFIT - Product Recommendations Page
// src/app/(user)/recommendations/page.tsx
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getRecommendations,
  generateRecommendations,
  markAsViewed,
  type RecommendationItem,
} from "./actions";

type FilterType = "all" | "viewed" | "not_viewed";

function getScoreColor(score: number) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

function getGrade(score: number) {
  if (score >= 85) return "PERFECT";
  if (score >= 70) return "GOOD";
  if (score >= 50) return "FAIR";
  if (score >= 30) return "POOR";
  return "RISK";
}

function getCategoryLabel(category: string): string {
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
  return labels[category] ?? category;
}

function FitScoreBadge({ score }: { score: number }) {
  const color = getScoreColor(score);
  const grade = getGrade(score);
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
        style={{ backgroundColor: color }}
      >
        {Math.round(score)}
      </div>
      <span
        className="text-[10px] font-bold"
        style={{ color }}
      >
        {grade}
      </span>
    </div>
  );
}

function RecommendationCard({
  item,
  onView,
}: {
  item: RecommendationItem;
  onView: () => void;
}) {
  return (
    <div
      className={`bg-white border rounded-2xl p-4 transition-all ${
        item.isViewed
          ? "border-[#E5E7EB] opacity-75"
          : "border-[#A7F3D0] shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Priority rank */}
        <div className="w-6 h-6 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[10px] font-bold text-[#6B7280]">
            {item.priority}
          </span>
        </div>

        {/* Product image placeholder */}
        <div className="w-14 h-14 rounded-xl bg-[#F3F4F6] flex items-center justify-center shrink-0">
          {item.productImage ? (
            <img
              src={item.productImage}
              alt={item.productName}
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
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] text-[#6B7280] mb-0.5">
                {item.productBrand}
              </p>
              <p className="text-sm font-semibold text-[#1F2937] truncate">
                {item.productName}
              </p>
            </div>
            <FitScoreBadge score={item.fitScore} />
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-block px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[10px] font-medium text-[#6B7280]">
              {getCategoryLabel(item.productCategory)}
            </span>
            {item.isViewed && (
              <span className="inline-block px-2 py-0.5 rounded-md bg-[#E5E7EB] text-[10px] font-medium text-[#9CA3AF]">
                확인함
              </span>
            )}
          </div>

          {/* Reason */}
          <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">
            {item.reason}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <Link
              href={`/shop/${item.productId}`}
              onClick={onView}
              className="flex-1 py-2 rounded-lg bg-[#10B981] text-white text-xs font-semibold text-center no-underline hover:bg-[#059669] transition-colors"
            >
              제품 상세 보기
            </Link>
            {!item.isViewed && (
              <button
                onClick={onView}
                className="px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-xs font-medium text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
              >
                확인
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getRecommendations(filter);
    if (result.success && result.data) {
      setItems(result.data);
    } else {
      setError(result.error ?? "오류가 발생했습니다.");
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    const result = await generateRecommendations();
    if (result.success) {
      await loadRecommendations();
    } else {
      setError(result.error ?? "추천 생성에 실패했습니다.");
    }
    setGenerating(false);
  };

  const handleView = async (id: string) => {
    await markAsViewed(id);
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isViewed: true } : item
      )
    );
  };

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "not_viewed", label: "미확인" },
    { value: "viewed", label: "확인함" },
  ];

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/home"
          className="w-8 h-8 rounded-lg border border-[#E5E7EB] flex items-center justify-center no-underline hover:bg-[#F9FAFB] transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6B7280"
            strokeWidth={2}
          >
            <path
              d="M15 18l-6-6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#1F2937]">추천 제품</h1>
          <p className="text-xs text-[#9CA3AF]">
            내 피부와 루틴에 맞는 제품 추천
          </p>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 mb-5"
      >
        {generating ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            추천 생성 중...
          </span>
        ) : (
          "새 추천 받기"
        )}
      </button>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              filter === f.value
                ? "bg-[#1F2937] text-white border-[#1F2937]"
                : "bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 mb-4">
          <p className="text-sm text-[#991B1B]">{error}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-[#10B981] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
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
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-sm text-[#6B7280] mb-1">추천 제품이 없습니다</p>
          <p className="text-xs text-[#9CA3AF] mb-4">
            &quot;새 추천 받기&quot; 버튼을 눌러 맞춤 추천을 받아보세요
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <RecommendationCard
              key={item.id}
              item={item}
              onView={() => handleView(item.id)}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && items.length > 0 && (
        <div className="mt-6 bg-[#F9FAFB] rounded-xl p-4 text-center">
          <p className="text-xs text-[#9CA3AF]">
            총 {items.length}개 제품 추천 | 미확인{" "}
            {items.filter((i) => !i.isViewed).length}개
          </p>
        </div>
      )}
    </div>
  );
}
