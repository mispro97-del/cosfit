// ============================================================
// COSFIT - Partner Product List Page (Enhanced)
// src/app/partner/products/page.tsx
// ============================================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPartnerProducts, type PartnerProductListItem } from "./actions";

const CAT_EMOJI: Record<string, string> = {
  CREAM: "🧴",
  SERUM: "💧",
  TONER: "🍃",
  CLEANSER: "🫧",
  SUNSCREEN: "☀️",
  EMULSION: "🌊",
  MASK: "🎭",
  EYE_CARE: "👁️",
  LIP_CARE: "💋",
  BODY_CARE: "🧼",
  MAKEUP_BASE: "✨",
  OTHER: "📦",
};

const STATUS_CONFIG = {
  active: { label: "활성", bg: "bg-green-50", text: "text-green-600" },
  out_of_stock: { label: "품절", bg: "bg-orange-50", text: "text-orange-600" },
  inactive: { label: "비활성", bg: "bg-gray-100", text: "text-gray-400" },
} as const;

export default function ProductsPage() {
  const [products, setProducts] = useState<PartnerProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "out_of_stock" | "inactive">("all");

  useEffect(() => {
    (async () => {
      const result = await getPartnerProducts();
      if (result.success && result.data) {
        setProducts(result.data);
      } else {
        setError(result.error ?? "제품 목록을 불러올 수 없습니다.");
      }
      setLoading(false);
    })();
  }, []);

  const filtered = filter === "all" ? products : products.filter((p) => p.status === filter);

  const totalStock = products.reduce((s, p) => s + p.totalStock, 0);
  const totalViews = products.reduce((s, p) => s + p.viewCount, 0);
  const totalPurchases = products.reduce((s, p) => s + p.purchaseCount, 0);

  if (loading) {
    return (
      <div className="p-8 max-w-[1100px]">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-40" />
          <div className="h-4 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-4 gap-4 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-xl mt-4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-[1100px]">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#1A1D21] m-0">제품 관리</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            자사 제품의 옵션, 이미지, 상세설명을 관리하세요
          </p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-lg bg-[#F3F4F6] text-[#6B7280] font-medium">
          총 {products.length}개 제품
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard label="등록 제품" value={products.length} unit="개" />
        <SummaryCard label="총 재고" value={totalStock.toLocaleString()} unit="EA" />
        <SummaryCard label="총 조회수" value={totalViews.toLocaleString()} unit="회" />
        <SummaryCard label="총 구매수" value={totalPurchases.toLocaleString()} unit="건" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "active", "out_of_stock", "inactive"] as const).map((f) => {
          const labels = { all: "전체", active: "활성", out_of_stock: "품절", inactive: "비활성" };
          const count =
            f === "all" ? products.length : products.filter((p) => p.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer transition-colors ${
                filter === f
                  ? "bg-[#10B981] text-white"
                  : "bg-white text-[#6B7280] hover:bg-[#F3F4F6]"
              }`}
            >
              {labels[f]} ({count})
            </button>
          );
        })}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-[#E5E9ED] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E9ED]">
              <th className="text-left px-5 py-3 text-xs font-medium text-[#9CA3AF]">제품</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">옵션 수</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">총 재고</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">조회수</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">구매수</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">프로모션</th>
              <th className="text-center px-3 py-3 text-xs font-medium text-[#9CA3AF]">상태</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-[#9CA3AF]">관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-[#9CA3AF]">
                  등록된 제품이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const cfg = STATUS_CONFIG[p.status];
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC] transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {CAT_EMOJI[p.category] ?? "📦"}
                        </span>
                        <div>
                          <div className="font-medium text-[#1A1D21]">{p.name}</div>
                          <div className="text-xs text-[#9CA3AF]">{p.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center text-[#4B5563]">{p.variantCount}</td>
                    <td className="text-center">
                      <span
                        className={`font-medium ${
                          p.totalStock === 0
                            ? "text-red-500"
                            : p.totalStock < 10
                            ? "text-orange-500"
                            : "text-[#4B5563]"
                        }`}
                      >
                        {p.totalStock.toLocaleString()}
                      </span>
                    </td>
                    <td className="text-center text-[#4B5563]">
                      {p.viewCount.toLocaleString()}
                    </td>
                    <td className="text-center text-[#4B5563]">
                      {p.purchaseCount.toLocaleString()}
                    </td>
                    <td className="text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                          p.isPromoted
                            ? "bg-blue-50 text-blue-600"
                            : "bg-[#F3F4F6] text-[#9CA3AF]"
                        }`}
                      >
                        {p.isPromoted ? "ON" : "OFF"}
                      </span>
                    </td>
                    <td className="text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${cfg.bg} ${cfg.text}`}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td className="text-right px-5">
                      <Link
                        href={`/partner/products/${p.id}`}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-[#E5E9ED] bg-white text-[#4B5563] no-underline hover:bg-[#F9FAFB] transition-colors"
                      >
                        상세 관리
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E9ED] p-4">
      <div className="text-xs text-[#9CA3AF] mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-[#1A1D21]">{value}</span>
        <span className="text-xs text-[#9CA3AF]">{unit}</span>
      </div>
    </div>
  );
}
