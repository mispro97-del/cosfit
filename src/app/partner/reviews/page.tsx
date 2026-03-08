"use client";

import { useEffect, useState } from "react";
import {
  getProductReviews,
  getReviewStats,
  type ReviewItem,
  type ReviewStatsData,
} from "./actions";

function StarDisplay({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="inline-flex items-center text-amber-400" aria-label={`${rating}점`}>
      {"★".repeat(full)}
      {half && "☆"}
      {"☆".repeat(empty)}
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  const s = (sentiment || "").toUpperCase();
  if (s === "POSITIVE") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
        긍정
      </span>
    );
  }
  if (s === "NEGATIVE") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
        부정
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
      중립
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const colorMap: Record<string, string> = {
    OLIVEYOUNG: "bg-green-50 text-green-700",
    HWAHAE: "bg-purple-50 text-purple-700",
    NAVER: "bg-emerald-50 text-emerald-700",
    INSTAGRAM: "bg-pink-50 text-pink-700",
    YOUTUBE: "bg-red-50 text-red-700",
  };
  const classes = colorMap[source] || "bg-gray-100 text-gray-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${classes}`}
    >
      {source}
    </span>
  );
}

type RatingFilter = 0 | 1 | 2 | 3 | 4 | 5;
type SentimentFilter = "ALL" | "POSITIVE" | "NEGATIVE" | "NEUTRAL";
type SourceFilter = "ALL" | string;

export default function ReviewsPage() {
  const [stats, setStats] = useState<ReviewStatsData | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>(0);
  const [sentimentFilter, setSentimentFilter] =
    useState<SentimentFilter>("ALL");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");

  useEffect(() => {
    async function load() {
      try {
        const [statsData, reviewsData] = await Promise.all([
          getReviewStats(),
          getProductReviews(),
        ]);
        setStats(statsData);
        setReviews(reviewsData);
      } catch (err) {
        console.error("Reviews load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Get unique sources
  const sources = Array.from(new Set(reviews.map((r) => r.source)));

  // Filter reviews
  const filtered = reviews.filter((r) => {
    if (ratingFilter > 0) {
      if (!r.rating || Math.round(r.rating) !== ratingFilter) return false;
    }
    if (sentimentFilter !== "ALL") {
      if ((r.sentiment || "").toUpperCase() !== sentimentFilter) return false;
    }
    if (sourceFilter !== "ALL") {
      if (r.source !== sourceFilter) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-gray-200" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1D21]">리뷰 관리</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          수집된 리뷰를 분석하고 관리합니다
        </p>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Average Rating */}
          <div className="rounded-xl border border-[#E5E9ED] bg-white p-5">
            <div className="text-sm font-medium text-[#6B7280]">평균 평점</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#1A1D21]">
                {stats.averageRating}
              </span>
              <StarDisplay rating={stats.averageRating} />
            </div>
            <div className="mt-1 text-xs text-[#9CA3AF]">
              평점이 있는 리뷰 기준
            </div>
          </div>

          {/* Total Reviews */}
          <div className="rounded-xl border border-[#E5E9ED] bg-white p-5">
            <div className="text-sm font-medium text-[#6B7280]">전체 리뷰</div>
            <div className="mt-2">
              <span className="text-3xl font-bold text-[#1A1D21]">
                {stats.totalReviews.toLocaleString()}
              </span>
              <span className="ml-1 text-lg text-[#6B7280]">건</span>
            </div>
          </div>

          {/* Sentiment Pie (CSS) */}
          <div className="rounded-xl border border-[#E5E9ED] bg-white p-5">
            <div className="text-sm font-medium text-[#6B7280] mb-3">
              감성 분석
            </div>
            {stats.totalReviews > 0 ? (
              <div className="space-y-2">
                {[
                  {
                    label: "긍정",
                    count: stats.sentimentBreakdown.positive,
                    color: "bg-green-500",
                  },
                  {
                    label: "중립",
                    count: stats.sentimentBreakdown.neutral,
                    color: "bg-gray-400",
                  },
                  {
                    label: "부정",
                    count: stats.sentimentBreakdown.negative,
                    color: "bg-red-500",
                  },
                ].map((s) => {
                  const pct =
                    stats.totalReviews > 0
                      ? Math.round((s.count / stats.totalReviews) * 100)
                      : 0;
                  return (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                      <span className="text-xs text-[#4B5563] w-8">
                        {s.label}
                      </span>
                      <div className="flex-1 h-3 rounded-full bg-[#F0F4F8] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.color} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#9CA3AF] w-10 text-right">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#9CA3AF]">데이터 없음</p>
            )}
          </div>
        </div>
      )}

      {/* Rating Distribution */}
      {stats && stats.totalReviews > 0 && (
        <div className="rounded-xl border border-[#E5E9ED] bg-white p-5">
          <h2 className="text-base font-semibold text-[#1A1D21] mb-4">
            평점 분포
          </h2>
          <div className="space-y-2">
            {[...stats.ratingDistribution].reverse().map((d) => {
              const maxCount = Math.max(
                ...stats.ratingDistribution.map((r) => r.count),
                1
              );
              return (
                <div key={d.rating} className="flex items-center gap-3">
                  <span className="w-12 text-sm text-[#4B5563] text-right">
                    {d.rating}점 ★
                  </span>
                  <div className="flex-1 h-6 rounded-full bg-[#F0F4F8] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{
                        width: `${(d.count / maxCount) * 100}%`,
                        minWidth: d.count > 0 ? "8px" : "0",
                      }}
                    />
                  </div>
                  <span className="w-10 text-xs text-[#9CA3AF] text-right">
                    {d.count}건
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reply notice */}
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
        리뷰 답글 기능 준비 중입니다. 추후 업데이트를 통해 제공될 예정입니다.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={ratingFilter}
          onChange={(e) =>
            setRatingFilter(Number(e.target.value) as RatingFilter)
          }
          className="rounded-lg border border-[#E5E9ED] bg-white px-3 py-2 text-sm text-[#4B5563]"
        >
          <option value={0}>전체 평점</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r}점
            </option>
          ))}
        </select>

        <select
          value={sentimentFilter}
          onChange={(e) =>
            setSentimentFilter(e.target.value as SentimentFilter)
          }
          className="rounded-lg border border-[#E5E9ED] bg-white px-3 py-2 text-sm text-[#4B5563]"
        >
          <option value="ALL">전체 감성</option>
          <option value="POSITIVE">긍정</option>
          <option value="NEUTRAL">중립</option>
          <option value="NEGATIVE">부정</option>
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-lg border border-[#E5E9ED] bg-white px-3 py-2 text-sm text-[#4B5563]"
        >
          <option value="ALL">전체 소스</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <span className="text-xs text-[#9CA3AF]">
          {filtered.length}건 표시 중
        </span>
      </div>

      {/* Review List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-[#E5E9ED] bg-white p-12 text-center">
            <p className="text-sm text-[#9CA3AF]">
              {reviews.length === 0
                ? "수집된 리뷰가 없습니다"
                : "필터 조건에 맞는 리뷰가 없습니다"}
            </p>
          </div>
        ) : (
          filtered.map((review) => {
            const isExpanded = expandedId === review.id;
            const contentPreview =
              review.content.length > 120
                ? review.content.slice(0, 120) + "..."
                : review.content;
            const date = new Date(review.collectedAt);
            const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;

            return (
              <div
                key={review.id}
                className="rounded-xl border border-[#E5E9ED] bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {review.rating !== null && (
                    <StarDisplay rating={review.rating} />
                  )}
                  <SentimentBadge sentiment={review.sentiment} />
                  <SourceBadge source={review.source} />
                  <span className="text-xs text-[#9CA3AF] ml-auto">
                    {dateStr}
                  </span>
                </div>

                <div className="text-xs text-[#6B7280] mb-1">
                  {review.productName}
                  {review.authorName && (
                    <span className="ml-2 text-[#9CA3AF]">
                      - {review.authorName}
                    </span>
                  )}
                </div>

                <p className="text-sm text-[#1A1D21] leading-relaxed">
                  {isExpanded ? review.content : contentPreview}
                </p>

                {review.content.length > 120 && (
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : review.id)
                    }
                    className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    {isExpanded ? "접기" : "더 보기"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
