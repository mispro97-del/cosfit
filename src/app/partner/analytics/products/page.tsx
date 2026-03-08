"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getProductPerformance,
  type ProductPerformanceData,
} from "../actions";

type SortKey = keyof Pick<
  ProductPerformanceData,
  | "name"
  | "viewCount"
  | "cartCount"
  | "purchaseCount"
  | "cartRate"
  | "purchaseRate"
  | "revenue"
>;

function formatWon(amount: number): string {
  return `\u20A9${amount.toLocaleString()}`;
}

export default function ProductPerformancePage() {
  const [products, setProducts] = useState<ProductPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortAsc, setSortAsc] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getProductPerformance();
        setProducts(data);
      } catch (err) {
        console.error("Product performance load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const filtered = showActiveOnly
    ? products.filter((p) => p.isActive)
    : products;

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortAsc
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    return sortAsc
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  function SortHeader({
    label,
    field,
    align = "right",
  }: {
    label: string;
    field: SortKey;
    align?: "left" | "right";
  }) {
    const isActive = sortKey === field;
    return (
      <th
        className={`py-3 px-3 font-medium text-[#6B7280] cursor-pointer hover:text-[#1A1D21] select-none ${
          align === "right" ? "text-right" : "text-left"
        }`}
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {isActive && (
            <span className="text-blue-500">{sortAsc ? "\u2191" : "\u2193"}</span>
          )}
        </span>
      </th>
    );
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-gray-200" />
          <div className="h-96 rounded-xl bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/partner/analytics"
              className="text-sm text-[#6B7280] hover:text-[#1A1D21] no-underline"
            >
              &larr; 매출 분석
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1D21]">
            제품별 성과 분석
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            전체 {products.length}개 제품의 성과를 비교합니다
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-[#4B5563] cursor-pointer">
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          활성 제품만 보기
        </label>
        <span className="text-xs text-[#9CA3AF]">
          {filtered.length}개 제품 표시 중
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E5E9ED] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E9ED] bg-[#F8FAFB]">
                <SortHeader label="제품명" field="name" align="left" />
                <SortHeader label="조회수" field="viewCount" />
                <SortHeader label="장바구니" field="cartCount" />
                <SortHeader label="구매" field="purchaseCount" />
                <SortHeader label="장바구니 전환율" field="cartRate" />
                <SortHeader label="구매 전환율" field="purchaseRate" />
                <SortHeader label="매출" field="revenue" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-sm text-[#9CA3AF]"
                  >
                    제품 데이터가 없습니다
                  </td>
                </tr>
              ) : (
                sorted.map((p) => (
                  <tr
                    key={p.partnerProductId}
                    className="border-b border-[#F0F4F8] hover:bg-[#F8FAFB] transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#1A1D21]">
                          {p.name}
                        </span>
                        {!p.isActive && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                            비활성
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-[#4B5563]">
                      {p.viewCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-[#4B5563]">
                      {p.cartCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-[#4B5563]">
                      {p.purchaseCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={
                          p.cartRate >= 10
                            ? "text-green-600 font-medium"
                            : "text-[#4B5563]"
                        }
                      >
                        {p.cartRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={
                          p.purchaseRate >= 20
                            ? "text-green-600 font-medium"
                            : "text-[#4B5563]"
                        }
                      >
                        {p.purchaseRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#1A1D21]">
                      {formatWon(p.revenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
