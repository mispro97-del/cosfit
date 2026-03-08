"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCollectedReviews,
  getReviewStats,
  collectReviewsForProduct,
  bulkAnalyzeSentiment,
  analyzeReviewSentiment,
  searchProducts,
  type CollectedReviewItem,
  type ReviewStats,
  type PaginatedReviews,
} from "./actions";

// ── Sentiment Badge ──

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#1E2130] px-2.5 py-0.5 text-xs font-medium text-[#8B92A5]">
        미분석
      </span>
    );
  }

  const config: Record<string, { bg: string; text: string; label: string }> = {
    POSITIVE: { bg: "bg-emerald-900/40", text: "text-emerald-300", label: "긍정" },
    NEGATIVE: { bg: "bg-red-900/40", text: "text-red-300", label: "부정" },
    NEUTRAL: { bg: "bg-gray-700/40", text: "text-gray-300", label: "중립" },
  };

  const c = config[sentiment] || config.NEUTRAL;

  return (
    <span className={`inline-flex items-center rounded-full ${c.bg} px-2.5 py-0.5 text-xs font-medium ${c.text}`}>
      {c.label}
    </span>
  );
}

// ── Stat Card ──

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl bg-[#141620] border border-[#1E2130] p-5">
      <div className="text-xs font-medium text-[#8B92A5] uppercase tracking-wider">{label}</div>
      <div className="mt-2 text-2xl font-bold text-white">{value}</div>
      {sub && <div className="mt-1 text-xs text-[#555B6E]">{sub}</div>}
    </div>
  );
}

// ── Main Page ──

export default function AdminReviewsPage() {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [data, setData] = useState<PaginatedReviews | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Product search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; name: string; brandName: string; category: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);

  // ── Load Data ──

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, reviewsData] = await Promise.all([
        getReviewStats(),
        getCollectedReviews(
          page,
          sourceFilter || undefined,
          undefined,
          sentimentFilter || undefined
        ),
      ]);
      setStats(statsData);
      setData(reviewsData);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  }, [page, sourceFilter, sentimentFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Product Search ──

  useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchProducts(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Generate Sample Reviews ──

  async function handleGenerateReviews(productId: string) {
    setGenerating(true);
    try {
      const result = await collectReviewsForProduct(productId);
      alert(`샘플 리뷰 ${result.count}개가 생성되었습니다.`);
      setSearchQuery("");
      setSearchResults([]);
      await loadData();
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  // ── Bulk Sentiment Analysis ──

  async function handleBulkAnalyze() {
    if (selectedIds.size === 0) {
      alert("분석할 리뷰를 선택해주세요.");
      return;
    }

    setBulkLoading(true);
    try {
      const result = await bulkAnalyzeSentiment(Array.from(selectedIds));
      alert(`분석 완료: 성공 ${result.success}건, 실패 ${result.failed}건`);
      setSelectedIds(new Set());
      await loadData();
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    } finally {
      setBulkLoading(false);
    }
  }

  // ── Single Sentiment Analysis ──

  async function handleSingleAnalyze(reviewId: string) {
    try {
      await analyzeReviewSentiment(reviewId);
      await loadData();
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    }
  }

  // ── Selection ──

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!data) return;
    if (selectedIds.size === data.reviews.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.reviews.map((r) => r.id)));
    }
  }

  // ── Derived stats ──

  const positiveCount = stats?.bySentiment.find((s) => s.sentiment === "POSITIVE")?.count || 0;
  const negativeCount = stats?.bySentiment.find((s) => s.sentiment === "NEGATIVE")?.count || 0;
  const neutralCount = stats?.bySentiment.find((s) => s.sentiment === "NEUTRAL")?.count || 0;
  const analyzedTotal = positiveCount + negativeCount + neutralCount;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">리뷰 수집</h1>
        <p className="mt-1 text-sm text-[#8B92A5]">
          제품 리뷰 수집 및 AI 감성 분석 관리
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="총 수집 리뷰"
          value={stats?.totalCount ?? "-"}
          sub={`분석완료 ${stats?.analyzedCount ?? 0}건`}
        />
        <StatCard
          label="긍정"
          value={analyzedTotal > 0 ? `${Math.round((positiveCount / analyzedTotal) * 100)}%` : "-"}
          sub={`${positiveCount}건`}
        />
        <StatCard
          label="부정"
          value={analyzedTotal > 0 ? `${Math.round((negativeCount / analyzedTotal) * 100)}%` : "-"}
          sub={`${negativeCount}건`}
        />
        <StatCard
          label="중립"
          value={analyzedTotal > 0 ? `${Math.round((neutralCount / analyzedTotal) * 100)}%` : "-"}
          sub={`${neutralCount}건`}
        />
      </div>

      {/* Product Search & Generate */}
      <div className="mb-8 rounded-xl bg-[#141620] border border-[#1E2130] p-5">
        <h2 className="text-sm font-semibold text-white mb-3">샘플 리뷰 생성</h2>
        <div className="relative">
          <input
            type="text"
            placeholder="제품명 또는 브랜드로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-[#0F1117] border border-[#1E2130] px-4 py-2.5 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8B92A5]">
              검색중...
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 rounded-lg bg-[#0F1117] border border-[#1E2130] divide-y divide-[#1E2130] max-h-60 overflow-auto">
            {searchResults.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-[#1E2130] transition-colors"
              >
                <div>
                  <span className="text-sm text-white">{product.name}</span>
                  <span className="ml-2 text-xs text-[#8B92A5]">
                    {product.brandName} / {product.category}
                  </span>
                </div>
                <button
                  onClick={() => handleGenerateReviews(product.id)}
                  disabled={generating}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generating ? "생성중..." : "샘플 생성"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters & Bulk Actions */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg bg-[#141620] border border-[#1E2130] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">전체 출처</option>
          <option value="SAMPLE">SAMPLE</option>
          <option value="OLIVEYOUNG">OLIVEYOUNG</option>
          <option value="HWAHAE">HWAHAE</option>
          <option value="NAVER">NAVER</option>
          <option value="INSTAGRAM">INSTAGRAM</option>
          <option value="YOUTUBE">YOUTUBE</option>
        </select>

        <select
          value={sentimentFilter}
          onChange={(e) => {
            setSentimentFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg bg-[#141620] border border-[#1E2130] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">전체 감성</option>
          <option value="POSITIVE">긍정</option>
          <option value="NEGATIVE">부정</option>
          <option value="NEUTRAL">중립</option>
        </select>

        <div className="flex-1" />

        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkAnalyze}
            disabled={bulkLoading}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {bulkLoading
              ? "분석중..."
              : `선택 분석 (${selectedIds.size}건)`}
          </button>
        )}
      </div>

      {/* Reviews Table */}
      <div className="rounded-xl bg-[#141620] border border-[#1E2130] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E2130] text-left text-xs font-medium uppercase tracking-wider text-[#8B92A5]">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={data ? selectedIds.size === data.reviews.length && data.reviews.length > 0 : false}
                    onChange={toggleSelectAll}
                    className="rounded border-[#1E2130] bg-[#0F1117] text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3">제품</th>
                <th className="px-4 py-3">출처</th>
                <th className="px-4 py-3">내용</th>
                <th className="px-4 py-3 text-center">별점</th>
                <th className="px-4 py-3 text-center">감성</th>
                <th className="px-4 py-3">수집일</th>
                <th className="px-4 py-3 text-center">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2130]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#8B92A5]">
                    로딩 중...
                  </td>
                </tr>
              ) : !data || data.reviews.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#8B92A5]">
                    수집된 리뷰가 없습니다. 제품을 검색하고 샘플 리뷰를 생성해보세요.
                  </td>
                </tr>
              ) : (
                data.reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-[#1A1D2E] transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(review.id)}
                        onChange={() => toggleSelect(review.id)}
                        className="rounded border-[#1E2130] bg-[#0F1117] text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium truncate max-w-[140px]">
                        {review.productName}
                      </div>
                      <div className="text-xs text-[#555B6E]">{review.brandName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-[#1E2130] px-2.5 py-0.5 text-xs font-medium text-[#8B92A5]">
                        {review.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[#C4C9D8] truncate max-w-[280px]" title={review.content}>
                        {review.content}
                      </div>
                      {review.keywords && (review.keywords as string[]).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(review.keywords as string[]).slice(0, 3).map((kw, i) => (
                            <span
                              key={i}
                              className="inline-flex rounded bg-blue-900/30 px-1.5 py-0.5 text-[10px] text-blue-300"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {review.rating !== null ? (
                        <span className="text-yellow-400">{review.rating.toFixed(1)}</span>
                      ) : (
                        <span className="text-[#555B6E]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <SentimentBadge sentiment={review.sentiment} />
                    </td>
                    <td className="px-4 py-3 text-[#8B92A5] text-xs whitespace-nowrap">
                      {new Date(review.collectedAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!review.sentiment && (
                        <button
                          onClick={() => handleSingleAnalyze(review.id)}
                          className="rounded-lg bg-[#1E2130] px-2.5 py-1.5 text-xs font-medium text-[#8B92A5] hover:bg-[#2A2E42] hover:text-white transition-colors"
                        >
                          분석
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#1E2130] px-4 py-3">
            <div className="text-xs text-[#8B92A5]">
              총 {data.total}건 중 {(data.page - 1) * data.pageSize + 1}-
              {Math.min(data.page * data.pageSize, data.total)}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg bg-[#1E2130] px-3 py-1.5 text-xs text-white hover:bg-[#2A2E42] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>
              {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, data.totalPages - 4));
                const pageNum = start + i;
                if (pageNum > data.totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                      pageNum === page
                        ? "bg-blue-600 text-white"
                        : "bg-[#1E2130] text-[#8B92A5] hover:bg-[#2A2E42] hover:text-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="rounded-lg bg-[#1E2130] px-3 py-1.5 text-xs text-white hover:bg-[#2A2E42] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
