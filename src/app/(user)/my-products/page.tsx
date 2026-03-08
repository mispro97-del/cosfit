"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getUserProducts, removeUserProduct, type UserProductItem } from "./actions";

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
  MAKEUP_BASE: "메이크업베이스",
  OTHER: "기타",
};

const ROUTINE_LABELS: Record<string, string> = {
  MORNING: "아침",
  EVENING: "저녁",
  BOTH: "아침/저녁",
};

type FilterType = "ALL" | "MORNING" | "EVENING";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={star <= rating ? "#F59E0B" : "none"}
          stroke={star <= rating ? "#F59E0B" : "#D1D5DB"}
          strokeWidth={1.5}
        >
          <polygon
            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </div>
  );
}

export default function MyProductsPage() {
  const [products, setProducts] = useState<UserProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const result = await getUserProducts();
    if (result.success && result.data) {
      setProducts(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDelete = async (id: string, productName: string) => {
    if (!confirm(`"${productName}"을(를) 삭제하시겠습니까?`)) return;

    setDeletingId(id);
    const result = await removeUserProduct(id);
    if (result.success) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert(result.error || "삭제에 실패했습니다.");
    }
    setDeletingId(null);
  };

  const filteredProducts = products.filter((p) => {
    if (filter === "ALL") return true;
    if (filter === "MORNING") return p.routineType === "MORNING" || p.routineType === "BOTH";
    if (filter === "EVENING") return p.routineType === "EVENING" || p.routineType === "BOTH";
    return true;
  });

  return (
    <div className="pb-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-[#1F2937]">내 제품</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            등록된 제품 {products.length}개
          </p>
        </div>
        <Link
          href="/my-products/add"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white no-underline transition-colors"
          style={{ backgroundColor: "#10B981" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          추가
        </Link>
      </div>

      {/* Routine Filter */}
      <div className="flex gap-2 mb-5">
        {(["ALL", "MORNING", "EVENING"] as FilterType[]).map((type) => {
          const isActive = filter === type;
          const label = type === "ALL" ? "전체" : type === "MORNING" ? "아침" : "저녁";
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-colors border-none cursor-pointer"
              style={{
                backgroundColor: isActive ? "#10B981" : "#F3F4F6",
                color: isActive ? "#FFFFFF" : "#6B7280",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div
            className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin"
            style={{ borderColor: "#10B981", borderTopColor: "transparent", borderWidth: "3px" }}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProducts.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center" style={{ border: "1px solid #E5E7EB" }}>
          <div className="w-14 h-14 rounded-full bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.8}>
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#4B5563] mb-1">등록된 제품이 없습니다</p>
          <p className="text-xs text-[#9CA3AF] mb-4">사용 중인 제품을 추가해보세요</p>
          <Link
            href="/my-products/add"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white no-underline"
            style={{ backgroundColor: "#10B981" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            제품 추가하기
          </Link>
        </div>
      )}

      {/* Product List */}
      {!loading && filteredProducts.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl bg-white p-4 relative"
              style={{ border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="flex gap-3">
                {/* Product Image */}
                <div className="w-16 h-16 rounded-xl bg-[#F3F4F6] flex items-center justify-center shrink-0 overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.5}>
                      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#6B7280]">{product.brandName}</p>
                  <p className="text-sm font-semibold text-[#1F2937] truncate mt-0.5">
                    {product.productName}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                      style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}
                    >
                      {CATEGORY_LABELS[product.category] || product.category}
                    </span>
                    {product.routineType && (
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium"
                        style={{ backgroundColor: "#ECFDF5", color: "#059669" }}
                      >
                        {ROUTINE_LABELS[product.routineType] || product.routineType}
                      </span>
                    )}
                    {product.usagePeriod && (
                      <span className="text-[10px] text-[#9CA3AF]">
                        {product.usagePeriod}개월 사용
                      </span>
                    )}
                  </div>
                  {product.rating && (
                    <div className="mt-1.5">
                      <StarRating rating={Math.round(product.rating)} />
                    </div>
                  )}
                  {product.review && (
                    <p className="text-xs text-[#6B7280] mt-1.5 truncate">
                      &ldquo;{product.review}&rdquo;
                    </p>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(product.id, product.productName)}
                  disabled={deletingId === product.id}
                  className="self-start p-1.5 rounded-lg transition-colors border-none cursor-pointer bg-transparent hover:bg-[#FEF2F2]"
                  title="삭제"
                >
                  {deletingId === product.id ? (
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: "#EF4444", borderTopColor: "transparent" }}
                    />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={1.8}>
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
