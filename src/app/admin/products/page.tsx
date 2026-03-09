"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getProductList,
  getProductStats,
  type ProductListItem,
} from "./actions";

// ── Constants ──

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "정상",
  DISCONTINUED: "단종",
  PENDING_REVIEW: "검토 대기",
  REJECTED: "반려",
  DATA_COLLECTING: "수집 중",
  NORM_FAILED: "정규화 실패",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-900/40 text-green-300",
  DISCONTINUED: "bg-gray-700/40 text-gray-400",
  PENDING_REVIEW: "bg-yellow-900/40 text-yellow-300",
  REJECTED: "bg-red-900/40 text-red-300",
  DATA_COLLECTING: "bg-blue-900/40 text-blue-300",
  NORM_FAILED: "bg-orange-900/40 text-orange-300",
};

const DATA_STATUS_LABELS: Record<string, string> = {
  NONE: "미수집",
  COLLECTING: "수집 중",
  RAW_SAVED: "원본 저장",
  NORMALIZING: "정규화 중",
  SUCCESS: "완료",
  FAILED: "실패",
  QUALITY_ISSUE: "품질 이슈",
};

const DATA_STATUS_COLORS: Record<string, string> = {
  NONE: "bg-gray-700/40 text-gray-400",
  COLLECTING: "bg-blue-900/40 text-blue-300",
  RAW_SAVED: "bg-cyan-900/40 text-cyan-300",
  NORMALIZING: "bg-indigo-900/40 text-indigo-300",
  SUCCESS: "bg-green-900/40 text-green-300",
  FAILED: "bg-red-900/40 text-red-300",
  QUALITY_ISSUE: "bg-orange-900/40 text-orange-300",
};

const CATEGORY_LABELS: Record<string, string> = {
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
  MAKEUP_BASE: "메이크업 베이스",
  OTHER: "기타",
};

export default function ProductsPage() {
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    byStatus: Record<string, number>;
    byDataStatus: Record<string, number>;
    byCategory: Record<string, number>;
  } | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getProductList(page, search, categoryFilter, statusFilter);
    if (result.success && result.data) {
      setItems(result.data.items);
      setTotal(result.data.total);
      setPageSize(result.data.pageSize);
    } else {
      setError(result.error ?? "데이터를 불러올 수 없습니다.");
    }
    setLoading(false);
  }, [page, search, categoryFilter, statusFilter]);

  const loadStats = useCallback(async () => {
    const result = await getProductStats();
    if (result.success && result.data) {
      setStats(result.data);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function handleCategoryChange(cat: string) {
    setPage(1);
    setCategoryFilter(cat);
  }

  function handleStatusChange(status: string) {
    setPage(1);
    setStatusFilter(status);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">제품 관리</h1>
          <p className="text-sm text-[#8B92A5] mt-1">
            전체 {stats?.total ?? total}개 제품
          </p>
        </div>
        <Link
          href="/admin/products/add"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors no-underline"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          제품 추가
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-[#1E2130] bg-[#141620] p-4">
            <div className="text-xs font-medium text-[#555B6E] uppercase">전체 제품</div>
            <div className="mt-1 text-2xl font-bold text-white">{stats.total.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-[#1E2130] bg-[#141620] p-4">
            <div className="text-xs font-medium text-[#555B6E] uppercase">정상 제품</div>
            <div className="mt-1 text-2xl font-bold text-green-400">{(stats.byStatus.ACTIVE ?? 0).toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-[#1E2130] bg-[#141620] p-4">
            <div className="text-xs font-medium text-[#555B6E] uppercase">성분 매칭 완료</div>
            <div className="mt-1 text-2xl font-bold text-blue-400">{(stats.byDataStatus.SUCCESS ?? 0).toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-[#1E2130] bg-[#141620] p-4">
            <div className="text-xs font-medium text-[#555B6E] uppercase">품질 이슈</div>
            <div className="mt-1 text-2xl font-bold text-orange-400">{(stats.byDataStatus.QUALITY_ISSUE ?? 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제품명, 브랜드, 품목보고번호 검색"
            className="flex-1 min-w-0 rounded-lg border border-[#2A2E42] bg-[#1E2130] px-4 py-2 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            검색
          </button>
        </form>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="rounded-lg border border-[#2A2E42] bg-[#1E2130] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">모든 카테고리</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
              {stats?.byCategory[key] ? ` (${stats.byCategory[key]})` : ""}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-lg border border-[#2A2E42] bg-[#1E2130] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">모든 상태</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
              {stats?.byStatus[key] ? ` (${stats.byStatus[key]})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[#1E2130] bg-[#141620] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1E2130] text-left text-xs font-semibold uppercase text-[#555B6E]">
                <th className="px-5 py-3">제품명</th>
                <th className="px-5 py-3">브랜드</th>
                <th className="px-5 py-3">카테고리</th>
                <th className="px-5 py-3">상태</th>
                <th className="px-5 py-3">데이터</th>
                <th className="px-5 py-3 text-center">성분 수</th>
                <th className="px-5 py-3">등록일</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#555B6E]">
                    로딩 중...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#555B6E]">
                    {search || categoryFilter || statusFilter
                      ? "검색 결과가 없습니다."
                      : "등록된 제품이 없습니다."}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#1E2130] last:border-0 hover:bg-[#1A1D2E] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-8 w-8 rounded-md object-cover bg-[#1E2130]"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-md bg-[#1E2130] flex items-center justify-center text-[#555B6E] text-xs">
                            N/A
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-white truncate max-w-[200px]">
                            {item.name}
                          </div>
                          {item.kfdaReportNo && (
                            <div className="text-xs text-[#555B6E]">
                              {item.kfdaReportNo}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#8B92A5]">
                      {item.brandNameKo || item.brandName}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[#8B92A5]">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                          STATUS_COLORS[item.status] ?? "bg-gray-700/40 text-gray-400"
                        }`}
                      >
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                          DATA_STATUS_COLORS[item.dataStatus] ??
                          "bg-gray-700/40 text-gray-400"
                        }`}
                      >
                        {DATA_STATUS_LABELS[item.dataStatus] ?? item.dataStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-[#8B92A5]">
                      {item.ingredientCount}
                    </td>
                    <td className="px-5 py-3 text-[#555B6E] text-xs">
                      {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-[#2A2E42] bg-[#1E2130] px-3 py-1.5 text-sm text-[#8B92A5] hover:bg-[#2A2E42] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  page === pageNum
                    ? "bg-blue-600 text-white"
                    : "border border-[#2A2E42] bg-[#1E2130] text-[#8B92A5] hover:bg-[#2A2E42] hover:text-white"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-lg border border-[#2A2E42] bg-[#1E2130] px-3 py-1.5 text-sm text-[#8B92A5] hover:bg-[#2A2E42] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
