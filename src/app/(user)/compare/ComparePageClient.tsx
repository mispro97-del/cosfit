// ============================================================
// COSFIT - Compare Page Client Component
// app/(user)/compare/ComparePageClient.tsx
// ============================================================

"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HistoryItem } from "./actions";
import { runCompareAnalysis, searchProducts } from "./actions";

// ── Helpers ──

function getScoreColor(score: number) {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  return "#EF4444";
}

function ScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "md" }) {
  const color = getScoreColor(score);
  const isSm = size === "sm";
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white ${
        isSm ? "w-8 h-8 text-[11px]" : "w-9 h-9 text-xs"
      }`}
      style={{ backgroundColor: color }}
    >
      {score}
    </div>
  );
}

const CATEGORY_EMOJI: Record<string, string> = {
  CREAM: "\uD83E\uDDF4", SERUM: "\uD83D\uDCA7", TONER: "\uD83C\uDF43",
  CLEANSER: "\uD83E\uDEE7", SUNSCREEN: "\u2600\uFE0F", MASK: "\uD83C\uDFAD", OTHER: "\u2728",
};

// ── Search Result Type ──

interface SearchResult {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string | null;
}

// ── Component ──

export function ComparePageClient({ history }: { history: HistoryItem[] }) {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    if (q.length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const result = await searchProducts(q);
      if (result.success && result.data) {
        setSearchResults(result.data);
      }
    } catch {
      // ignore
    }
    setSearching(false);
  }, []);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => handleSearch(val), 300);
  };

  const handleSelectProduct = async (productId: string) => {
    setAnalyzing(productId);
    setError(null);
    const result = await runCompareAnalysis(productId);
    if (result.success && result.data) {
      router.push(`/compare/${result.data.compareId}`);
    } else {
      setError(result.error || "분석 실행에 실패했습니다.");
      setAnalyzing(null);
    }
  };

  return (
    <div className="pb-8">
      {/* CTA Banner */}
      <button
        onClick={() => {
          setShowSearch(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="w-full text-left rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] p-5 mb-6 text-white border-none cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold mb-1">
              {"\uD83D\uDD0D"} {" "}
              화장품 비교하기
            </h2>
            <p className="text-sm text-white/80 m-0">
              이 제품이 나에게 잘 맞는지 바로 확인해보세요
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </button>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center pt-16">
          <div className="w-full max-w-[420px] mx-4 bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Search Header */}
            <div className="p-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setQuery("");
                    setSearchResults([]);
                    setError(null);
                  }}
                  className="text-[#6B7280] bg-transparent border-none cursor-pointer p-1"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F3F4F6]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                  </svg>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder="제품명 또는 브랜드로 검색"
                    className="flex-1 border-none outline-none text-sm text-[#1F2937] bg-transparent placeholder:text-[#9CA3AF]"
                  />
                  {query && (
                    <button
                      onClick={() => { setQuery(""); setSearchResults([]); inputRef.current?.focus(); }}
                      className="bg-[#E5E7EB] border-none rounded-full w-5 h-5 cursor-pointer text-[10px] text-[#6B7280] flex items-center justify-center"
                    >
                      x
                    </button>
                  )}
                </div>
              </div>
              {error && (
                <p className="text-xs text-red-500 mt-2 px-1">{error}</p>
              )}
            </div>

            {/* Search Results */}
            <div className="max-h-[400px] overflow-y-auto">
              {searching && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!searching && query.length > 0 && searchResults.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-[#6B7280]">검색 결과가 없습니다</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">다른 검색어를 입력해보세요</p>
                </div>
              )}
              {!searching && searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product.id)}
                  disabled={analyzing !== null}
                  className="w-full flex items-center gap-3 px-4 py-3.5 border-none bg-transparent cursor-pointer text-left hover:bg-[#F9FAFB] transition-colors border-b border-[#F3F4F6] disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-xl shrink-0">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      CATEGORY_EMOJI[product.category] || "\u2728"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1F2937] truncate">{product.name}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{product.brand}</p>
                  </div>
                  {analyzing === product.id ? (
                    <div className="w-5 h-5 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <span className="text-xs text-[#10B981] font-semibold shrink-0">분석</span>
                  )}
                </button>
              ))}
              {!searching && query.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-[#9CA3AF]">제품명 또는 브랜드를 검색하세요</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 나의 비교 기록 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3 className="text-base font-bold text-[#1F2937]">나의 비교 기록</h3>
        </div>
        {history.length === 0 ? (
          <div className="bg-[#F9FAFB] rounded-2xl p-8 text-center">
            <p className="text-sm text-[#6B7280]">아직 비교 기록이 없습니다</p>
            <p className="text-xs text-[#9CA3AF] mt-1">위 배너를 눌러 제품을 분석해보세요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((item) => (
              <Link key={item.id} href={`/compare/${item.id}`} className="block no-underline">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-2xl shrink-0 relative">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      CATEGORY_EMOJI[item.productCategory] || "\u2728"
                    )}
                    <div className="absolute -top-1.5 -right-1.5">
                      <ScoreBadge score={item.fitScore} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#6B7280] mb-0.5">{item.productBrand}</p>
                    <p className="text-sm font-semibold text-[#1F2937] truncate">{item.productName}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2}>
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 내 기준으로 본 신제품 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth={2}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 className="text-base font-bold text-[#1F2937]">내 기준으로 본 신제품</h3>
          </div>
          <Link href="/recommendations" className="text-sm text-[#10B981] font-semibold no-underline">
            전체보기 &rarr;
          </Link>
        </div>
        <p className="text-xs text-[#9CA3AF] mb-2">
          추천 페이지에서 나에게 맞는 제품을 확인하세요
        </p>
      </div>
    </div>
  );
}
