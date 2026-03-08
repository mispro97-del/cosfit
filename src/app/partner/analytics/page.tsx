"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getSalesOverview,
  getTopProducts,
  getFitScoreDistribution,
  type SalesOverviewData,
  type TopProductData,
  type FitScoreDistributionData,
} from "./actions";

type Period = "day" | "week" | "month";

function formatWon(amount: number): string {
  return `\u20A9${amount.toLocaleString()}`;
}

function DeltaBadge({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        0%
      </span>
    );
  }
  const isPositive = value > 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isPositive
          ? "bg-green-50 text-green-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      {isPositive ? "+" : ""}
      {value}%
    </span>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [sales, setSales] = useState<SalesOverviewData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductData[]>([]);
  const [fitScore, setFitScore] = useState<FitScoreDistributionData | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [salesData, topData, fitData] = await Promise.all([
          getSalesOverview(period),
          getTopProducts(5),
          getFitScoreDistribution(),
        ]);
        if (cancelled) return;
        setSales(salesData);
        setTopProducts(topData);
        setFitScore(fitData);
      } catch (err) {
        console.error("Analytics load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

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

  const maxChartRevenue = sales
    ? Math.max(...sales.chartData.map((d) => d.revenue), 1)
    : 1;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1D21]">매출 분석</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            매출 현황과 제품 성과를 분석합니다
          </p>
        </div>
        <Link
          href="/partner/analytics/products"
          className="inline-flex items-center gap-1 rounded-lg border border-[#E5E9ED] bg-white px-4 py-2 text-sm font-medium text-[#4B5563] hover:bg-[#F0F4F8] transition-colors no-underline"
        >
          제품별 상세 보기 &rarr;
        </Link>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-1 rounded-lg bg-[#F0F4F8] p-1 w-fit">
        {(["day", "week", "month"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              period === p
                ? "bg-white text-[#1A1D21] shadow-sm"
                : "text-[#6B7280] hover:text-[#1A1D21]"
            }`}
          >
            {p === "day" ? "일별" : p === "week" ? "주별" : "월별"}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      {sales && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#E5E9ED] bg-white p-5">
            <div className="text-sm font-medium text-[#6B7280]">총 매출</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#1A1D21]">
                {formatWon(sales.totalRevenue)}
              </span>
              <DeltaBadge value={sales.revenueDelta} />
            </div>
            <div className="mt-1 text-xs text-[#9CA3AF]">이전 기간 대비</div>
          </div>
          <div className="rounded-xl border border-[#E5E9ED] bg-white p-5">
            <div className="text-sm font-medium text-[#6B7280]">주문 수</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#1A1D21]">
                {sales.orderCount.toLocaleString()}건
              </span>
              <DeltaBadge value={sales.orderCountDelta} />
            </div>
            <div className="mt-1 text-xs text-[#9CA3AF]">이전 기간 대비</div>
          </div>
          <div className="rounded-xl border border-[#E5E9ED] bg-white p-5">
            <div className="text-sm font-medium text-[#6B7280]">
              평균 주문 금액
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#1A1D21]">
                {formatWon(sales.averageOrderValue)}
              </span>
              <DeltaBadge value={sales.avgOrderValueDelta} />
            </div>
            <div className="mt-1 text-xs text-[#9CA3AF]">이전 기간 대비</div>
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      {sales && sales.chartData.length > 0 && (
        <div className="rounded-xl border border-[#E5E9ED] bg-white p-5">
          <h2 className="text-base font-semibold text-[#1A1D21] mb-4">
            매출 추이
          </h2>
          <div className="flex items-end gap-2 h-48">
            {sales.chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-[#9CA3AF]">
                  {formatWon(d.revenue)}
                </span>
                <div
                  className="w-full rounded-t-md bg-blue-500 transition-all min-h-[4px]"
                  style={{
                    height: `${(d.revenue / maxChartRevenue) * 100}%`,
                  }}
                />
                <span className="text-[10px] text-[#6B7280] mt-1">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sales && sales.chartData.length === 0 && (
        <div className="rounded-xl border border-[#E5E9ED] bg-white p-8 text-center">
          <p className="text-sm text-[#9CA3AF]">
            해당 기간의 매출 데이터가 없습니다
          </p>
        </div>
      )}

      {/* Top 5 Products */}
      <div className="rounded-xl border border-[#E5E9ED] bg-white p-5">
        <h2 className="text-base font-semibold text-[#1A1D21] mb-4">
          매출 상위 5개 제품
        </h2>
        {topProducts.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] text-center py-4">
            제품 데이터가 없습니다
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E9ED]">
                  <th className="py-3 px-3 text-left font-medium text-[#6B7280]">
                    제품명
                  </th>
                  <th className="py-3 px-3 text-right font-medium text-[#6B7280]">
                    조회수
                  </th>
                  <th className="py-3 px-3 text-right font-medium text-[#6B7280]">
                    장바구니
                  </th>
                  <th className="py-3 px-3 text-right font-medium text-[#6B7280]">
                    구매
                  </th>
                  <th className="py-3 px-3 text-right font-medium text-[#6B7280]">
                    전환율
                  </th>
                  <th className="py-3 px-3 text-right font-medium text-[#6B7280]">
                    매출
                  </th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#F0F4F8] hover:bg-[#F8FAFB] transition-colors"
                  >
                    <td className="py-3 px-3 font-medium text-[#1A1D21]">
                      {p.name}
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
                    <td className="py-3 px-3 text-right text-[#4B5563]">
                      {p.conversionRate}%
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#1A1D21]">
                      {formatWon(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FIT Score Section */}
      {fitScore && (
        <div className="rounded-xl border border-[#E5E9ED] bg-white p-5">
          <h2 className="text-base font-semibold text-[#1A1D21] mb-4">
            FIT Score 분석
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Averages */}
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-[#F0F4F8] px-4 py-3">
                <span className="text-sm text-[#4B5563]">우리 브랜드 평균</span>
                <span className="text-xl font-bold text-blue-600">
                  {fitScore.partnerAverage}점
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#F0F4F8] px-4 py-3">
                <span className="text-sm text-[#4B5563]">플랫폼 전체 평균</span>
                <span className="text-xl font-bold text-[#6B7280]">
                  {fitScore.platformAverage}점
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                총 {fitScore.totalCompares.toLocaleString()}건의 비교 분석 기준
              </p>
            </div>

            {/* Distribution */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[#4B5563] mb-3">
                점수 분포
              </h3>
              {fitScore.distribution.map((d) => {
                const maxCount = Math.max(
                  ...fitScore.distribution.map((b) => b.count),
                  1
                );
                return (
                  <div key={d.range} className="flex items-center gap-3">
                    <span className="w-14 text-xs text-[#6B7280] text-right">
                      {d.range}
                    </span>
                    <div className="flex-1 h-5 rounded-full bg-[#F0F4F8] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{
                          width: `${(d.count / maxCount) * 100}%`,
                          minWidth: d.count > 0 ? "8px" : "0",
                        }}
                      />
                    </div>
                    <span className="w-8 text-xs text-[#9CA3AF]">
                      {d.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
