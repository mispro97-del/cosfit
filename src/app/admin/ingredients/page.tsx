"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getIngredients, type IngredientListItem } from "./actions";

const SAFETY_GRADE_COLORS: Record<string, string> = {
  SAFE: "bg-green-900/40 text-green-300",
  MODERATE: "bg-yellow-900/40 text-yellow-300",
  CAUTION: "bg-orange-900/40 text-orange-300",
  HAZARDOUS: "bg-red-900/40 text-red-300",
  UNKNOWN: "bg-gray-700/40 text-gray-400",
};

const SAFETY_GRADE_LABELS: Record<string, string> = {
  SAFE: "안전",
  MODERATE: "보통",
  CAUTION: "주의",
  HAZARDOUS: "위험",
  UNKNOWN: "미분류",
};

export default function IngredientsPage() {
  const router = useRouter();
  const [items, setItems] = useState<IngredientListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getIngredients(page, search);
    if (result.success && result.data) {
      setItems(result.data.items);
      setTotal(result.data.total);
      setPageSize(result.data.pageSize);
    } else {
      setError(result.error ?? "데이터를 불러올 수 없습니다.");
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">성분 관리</h1>
          <p className="text-sm text-[#8B92A5] mt-1">
            전체 {total}개 성분 | {totalPages} 페이지
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="성분명 검색 (INCI / 한국명)"
            className="w-64 rounded-lg border border-[#2A2E42] bg-[#1E2130] px-4 py-2 text-sm text-white placeholder-[#555B6E] focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            검색
          </button>
        </form>
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
                <th className="px-5 py-3">INCI명</th>
                <th className="px-5 py-3">한국명</th>
                <th className="px-5 py-3">안전등급</th>
                <th className="px-5 py-3 text-center">EWG</th>
                <th className="px-5 py-3 text-center">동의어</th>
                <th className="px-5 py-3 text-center">상호작용</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[#555B6E]">
                    로딩 중...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-[#555B6E]">
                    {search ? `"${search}" 검색 결과가 없습니다.` : "등록된 성분이 없습니다."}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/admin/ingredients/${item.id}`)}
                    className="border-b border-[#1E2130] last:border-0 cursor-pointer hover:bg-[#1A1D2E] transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-white">{item.nameInci}</td>
                    <td className="px-5 py-3 text-[#8B92A5]">{item.nameKo ?? "-"}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${SAFETY_GRADE_COLORS[item.safetyGrade] ?? SAFETY_GRADE_COLORS.UNKNOWN}`}
                      >
                        {SAFETY_GRADE_LABELS[item.safetyGrade] ?? item.safetyGrade}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-[#8B92A5]">
                      {item.ewgScore != null ? item.ewgScore : "-"}
                    </td>
                    <td className="px-5 py-3 text-center text-[#8B92A5]">{item.synonymCount}</td>
                    <td className="px-5 py-3 text-center text-[#8B92A5]">{item.interactionCount}</td>
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
